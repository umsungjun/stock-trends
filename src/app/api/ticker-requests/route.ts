import { NextRequest, NextResponse } from "next/server";

import { getIpHash } from "@/lib/board/identity";
import { checkRateLimit, isBanned } from "@/lib/board/moderation";
import { normalizeSlug } from "@/lib/market/slug";
import { createServerClient, isBoardEnabled } from "@/lib/supabase/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

/**
 * 요청 즉시 수신 가능 여부를 확인한다.
 *
 * "조회 시점에 시세 API를 부르지 않는다"는 원칙과 어긋나 보이지만, 이건 차트 조회가 아니라
 * 사용자가 명시적으로 누른 드문 이벤트다. 레이트리밋도 걸려 있다.
 * 지원하지 않는 종목을 일주일 기다린 끝에 알게 되는 게 최악이라 즉시 답한다.
 *
 * 다만 한글 종목명은 코드를 알 수 없어 검증할 수 없다 — 그건 접수만 한다.
 */
const probeSource = async (
  query: string
): Promise<"ok" | "unsupported" | "unknown"> => {
  const q = query.trim();

  // 6자리 숫자 = 국내 종목코드
  if (/^\d{6}$/.test(q)) {
    try {
      const res = await fetch(
        `https://api.finance.naver.com/siseJson.naver?symbol=${q}&requestType=1&startTime=20240101&endTime=20240201&timeframe=month`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) }
      );
      const text = await res.text();
      return text.includes("[") && text.split("[").length > 2
        ? "ok"
        : "unsupported";
    } catch {
      return "unknown";
    }
  }

  // 알파벳 = 미국 티커. 접미사 후보를 순회한다 (거래소 힌트가 없으므로)
  if (/^[A-Za-z][A-Za-z.\-]{0,6}$/.test(q)) {
    const bare = q
      .toUpperCase()
      .replace(/\.([A-Z])$/, (_, c) => c.toLowerCase());
    for (const candidate of [bare, `${bare}.O`, `${bare}.K`]) {
      try {
        const res = await fetch(
          `https://api.stock.naver.com/stock/${encodeURIComponent(candidate)}/basic`,
          {
            headers: {
              "User-Agent": UA,
              Referer: "https://m.stock.naver.com/",
            },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!res.ok) continue;
        const d = await res.json();
        if (d?.stockName) return "ok";
      } catch {
        // 다음 후보로
      }
    }
    return "unsupported";
  }

  return "unknown"; // 한글 종목명 등 — 검증 불가, 접수만
};

const MESSAGES = {
  ok: "확인했어요. 다음 주 데이터 갱신에 추가됩니다.",
  unsupported:
    "이 종목은 시세 데이터를 받을 수 없어 추가가 어렵습니다. 확인 후 알려드릴게요.",
  unknown: "요청을 접수했어요. 확인 후 추가하겠습니다.",
} as const;

/** @description 종목 추가 요청. 중복은 행이 아니라 votes로 쌓아 수요 랭킹이 되게 한다 */
export async function POST(request: NextRequest) {
  if (!isBoardEnabled()) {
    return NextResponse.json(
      { error: "아직 요청을 받을 수 없습니다" },
      { status: 503 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const raw = typeof payload.query === "string" ? payload.query.trim() : "";
  if (raw.length < 1 || raw.length > 60) {
    return NextResponse.json(
      { error: "종목명을 입력해 주세요" },
      { status: 400 }
    );
  }

  const norm = normalizeSlug(raw);
  if (!norm) {
    return NextResponse.json(
      { error: "종목명을 입력해 주세요" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const ipHash = getIpHash(request);

  if (await isBanned(supabase, ipHash)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해 주세요" },
      { status: 429 }
    );
  }
  const rate = await checkRateLimit(
    supabase,
    "ticker_requests",
    ipHash,
    "request"
  );
  if (!rate.ok) {
    return NextResponse.json({ error: rate.reason }, { status: 429 });
  }

  // 이미 접수된 종목이면 투표만 올린다
  const { data: existing } = await supabase
    .from("ticker_requests")
    .select("id, votes, status")
    .eq("norm_query", norm)
    .maybeSingle();

  if (existing) {
    // 처리가 끝난 건에는 투표를 받지 않는다 — 대기 목록의 우선순위를 흐리기만 한다
    if (existing.status !== "queued") {
      return NextResponse.json({
        status: existing.status,
        votes: existing.votes,
        message:
          existing.status === "added"
            ? "이미 추가된 종목이에요. 검색해 보세요."
            : "확인해 봤지만 시세를 받을 수 없는 종목이에요.",
      });
    }

    const { error: voteError } = await supabase
      .from("ticker_request_votes")
      .insert({ request_id: existing.id, ip_hash: ipHash });

    // 같은 IP의 재투표는 조용히 무시한다 (unique 위반)
    let votes = existing.votes;
    if (!voteError) {
      votes = existing.votes + 1;
      await supabase
        .from("ticker_requests")
        .update({ votes, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    return NextResponse.json({
      status: existing.status,
      votes,
      message: `이미 ${votes}명이 요청했어요. 우선순위에 반영됩니다.`,
    });
  }

  const probe = await probeSource(raw);
  const status = probe === "unsupported" ? "unsupported" : "queued";

  const { data, error } = await supabase
    .from("ticker_requests")
    .insert({
      raw_query: raw,
      norm_query: norm,
      status,
      note: probe === "unsupported" ? "소스에서 시세를 받을 수 없음" : null,
      first_ip_hash: ipHash,
    })
    .select("id, votes")
    .single();

  if (error || !data) {
    console.error("[ticker-request]", error?.message);
    return NextResponse.json(
      { error: "요청을 저장하지 못했습니다" },
      { status: 500 }
    );
  }

  await supabase
    .from("ticker_request_votes")
    .insert({ request_id: data.id, ip_hash: ipHash });

  return NextResponse.json(
    { status, votes: data.votes, message: MESSAGES[probe] },
    { status: 201 }
  );
}
