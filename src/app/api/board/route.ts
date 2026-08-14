import { NextRequest, NextResponse } from "next/server";

import { contentHash, createEditToken, getIpHash } from "@/lib/board/identity";
import {
  checkRateLimit,
  isBanned,
  screenContent,
} from "@/lib/board/moderation";
import { deriveNickname, isValidSeed } from "@/lib/board/nickname";
import { createServerClient, isBoardEnabled } from "@/lib/supabase/server";
import type { BoardPost } from "@/types/board";

const PAGE_SIZE = 20;
const MAX_BODY = 2000;

/** DB 행 → 응답 형태. 비밀 컬럼이 새지 않도록 화이트리스트로만 옮긴다 */
const toPost = (row: Record<string, unknown>): BoardPost => ({
  id: String(row.id),
  nickname: String(row.nickname),
  body: String(row.body),
  tickerCode: (row.ticker_code as string | null) ?? null,
  createdAt: String(row.created_at),
  editedAt: (row.edited_at as string | null) ?? null,
});

const disabled = () =>
  NextResponse.json(
    { error: "게시판이 아직 설정되지 않았습니다" },
    { status: 503 }
  );

/**
 * @description 게시글 목록. 커서 페이지네이션.
 *
 * 응답에 짧은 캐시를 걸어 바이럴 스레드가 떠도 DB 읽기가 30초당 1회로 수렴하게 한다.
 */
export async function GET(request: NextRequest) {
  if (!isBoardEnabled()) return disabled();

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const ticker = searchParams.get("ticker");

  const supabase = createServerClient();
  let query = supabase
    .from("posts")
    .select("id, nickname, body, ticker_code, created_at, edited_at")
    .is("deleted_at", null)
    .eq("shadowbanned", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (ticker) query = query.eq("ticker_code", ticker);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "목록을 불러오지 못했습니다" },
      { status: 500 }
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const posts = rows.slice(0, PAGE_SIZE).map(toPost);

  return NextResponse.json(
    { posts, nextCursor: hasMore ? posts[posts.length - 1].createdAt : null },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
      },
    }
  );
}

/**
 * @description 글 작성.
 *
 * 닉네임은 클라이언트가 보낸 문자열이 아니라 **seed로 서버가 다시 만든다** —
 * 임의 문자열(사칭·욕설)이 닉네임 자리에 들어오는 걸 구조적으로 막는다.
 * 섀도밴 판정이 나도 성공 응답을 준다. 차단당한 걸 알면 IP를 바꿔 다시 오기 때문이다.
 */
export async function POST(request: NextRequest) {
  if (!isBoardEnabled()) return disabled();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const seed = payload.nicknameSeed;
  const tickerCode =
    typeof payload.tickerCode === "string" ? payload.tickerCode : null;
  const elapsedMs = Number(payload.elapsedMs) || 0;

  if (body.length < 2 || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `내용은 2자 이상 ${MAX_BODY}자 이하로 써 주세요` },
      { status: 400 }
    );
  }
  if (!isValidSeed(seed)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const ipHash = getIpHash(request);

  if (await isBanned(supabase, ipHash)) {
    // 차단 사실을 알리지 않는다
    return NextResponse.json(
      { error: "잠시 후 다시 시도해 주세요" },
      { status: 429 }
    );
  }

  const rate = await checkRateLimit(supabase, "posts", ipHash, "post");
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.reason },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const hash = contentHash(body);
  const verdict = await screenContent(supabase, body, {
    ipHash,
    contentHash: hash,
    elapsedMs,
    honeypot: payload.website,
  });
  if (verdict.action === "block") {
    return NextResponse.json({ error: verdict.reason }, { status: 400 });
  }

  const { token, hash: tokenHash } = createEditToken();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      nickname: deriveNickname(seed),
      nickname_seed: seed,
      body,
      ticker_code: tickerCode,
      edit_token_hash: tokenHash,
      ip_hash: ipHash,
      content_hash: hash,
      shadowbanned: verdict.action === "shadowban",
    })
    .select("id, nickname, body, ticker_code, created_at, edited_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "등록하지 못했습니다" }, { status: 500 });
  }

  // 섀도밴이어도 작성자에게는 성공으로 보인다
  return NextResponse.json(
    { post: toPost(data), editToken: token },
    { status: 201 }
  );
}
