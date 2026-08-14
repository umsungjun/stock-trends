import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 스팸 방어 — 레이트리밋 · 콘텐츠 필터 · 섀도밴.
 *
 * 주식 게시판은 리딩방·코인·대출 광고 봇의 표적이라 방명록과 위협 모델이 다르다.
 * 차단 사실을 알리지 않는 섀도밴이 핵심이다 — 막힌 걸 알면 IP를 바꿔 다시 오지만,
 * 자기 글이 잘 올라간 것처럼 보이면 그냥 떠난다.
 */

export type RateScope = "post" | "report" | "request";

const LIMITS: Record<RateScope, { windowSec: number; max: number }> = {
  post: { windowSec: 60, max: 1 },
  report: { windowSec: 300, max: 3 },
  request: { windowSec: 600, max: 3 },
};

export type RateResult =
  { ok: true } | { ok: false; retryAfterSec: number; reason: string };

/**
 * @description IP 해시 기준 레이트리밋.
 * @param supabase - service_role 클라이언트
 * @param table - 검사할 테이블
 * @param ipHash
 * @param scope - 한도 프로필
 */
export const checkRateLimit = async (
  supabase: SupabaseClient,
  table: string,
  ipHash: string,
  scope: RateScope
): Promise<RateResult> => {
  const { windowSec, max } = LIMITS[scope];
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) < max) return { ok: true };
  return {
    ok: false,
    retryAfterSec: windowSec,
    reason: `너무 자주 시도했습니다. ${windowSec}초 후 다시 시도해 주세요.`,
  };
};

/** @description 차단된 IP인지 */
export const isBanned = async (
  supabase: SupabaseClient,
  ipHash: string
): Promise<boolean> => {
  const { data } = await supabase
    .from("banned_ip_hashes")
    .select("until")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  if (!data) return false;
  return !data.until || new Date(data.until) > new Date();
};

export type Verdict =
  | { action: "allow" }
  | { action: "shadowban"; reason: string }
  | { action: "block"; reason: string };

const LINK_RE = /https?:\/\/|www\.|\.(com|net|kr|io|me)\b/gi;
/** 자모·이모지만 길게 반복하는 도배 */
const NOISE_RE = /([ㄱ-ㅎㅏ-ㅣ!?.,~ㅋㅎ])\1{14,}/;

/**
 * @description 본문을 심사한다.
 *
 * 차단(block)은 사용자에게 알리고, 섀도밴은 성공한 것처럼 응답한 뒤 남에게만 숨긴다.
 * @param supabase - service_role 클라이언트
 * @param body - 본문
 * @param meta.ipHash
 * @param meta.contentHash - 도배 탐지용
 * @param meta.elapsedMs - 폼을 연 뒤 제출까지 걸린 시간
 * @param meta.honeypot - 봇만 채우는 숨은 필드
 */
export const screenContent = async (
  supabase: SupabaseClient,
  body: string,
  meta: {
    ipHash: string;
    contentHash: string;
    elapsedMs: number;
    honeypot?: string;
  }
): Promise<Verdict> => {
  // 사람은 2초 안에 글을 쓰지 못한다. 숨은 필드는 사람 눈에 보이지 않는다
  if (meta.honeypot) return { action: "shadowban", reason: "honeypot" };
  if (meta.elapsedMs < 2000) return { action: "shadowban", reason: "too-fast" };

  if (NOISE_RE.test(body)) {
    return { action: "block", reason: "같은 문자를 너무 많이 반복했습니다." };
  }

  const links = body.match(LINK_RE)?.length ?? 0;
  if (links >= 3) {
    return { action: "block", reason: "링크를 너무 많이 포함했습니다." };
  }

  // 금칙어는 테이블에 둔다 — 스팸 문구는 주 단위로 바뀌므로 배포 없이 대응해야 한다
  const { data: terms } = await supabase
    .from("blocked_terms")
    .select("term, severity");
  const haystack = body.toLowerCase().replace(/\s+/g, "");
  for (const t of terms ?? []) {
    if (!haystack.includes(String(t.term).toLowerCase().replace(/\s+/g, ""))) {
      continue;
    }
    return t.severity === "block"
      ? { action: "block", reason: "허용되지 않는 문구가 포함되어 있습니다." }
      : { action: "shadowban", reason: `term:${t.term}` };
  }

  // 같은 IP가 24시간 안에 같은 본문을 다시 올리는 것은 도배다
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", meta.ipHash)
    .eq("content_hash", meta.contentHash)
    .gte("created_at", dayAgo);

  if ((count ?? 0) > 0) {
    return { action: "block", reason: "같은 내용을 이미 등록했습니다." };
  }

  if (links >= 2) return { action: "shadowban", reason: "links" };
  return { action: "allow" };
};
