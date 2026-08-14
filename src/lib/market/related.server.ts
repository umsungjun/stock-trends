import { getPopularSlugs, getTickerMap } from "@/lib/market/registry.server";
import { SEPARATOR } from "@/lib/market/slug";

import "server-only";

/**
 * 내부 링크 후보 산출 — 크롤러가 롱테일 페이지로 타고 들어갈 경로를 만든다.
 * 사전 생성 목록(popular-slugs.json)에서만 고르므로 404나 온디맨드 생성으로 새지 않는다.
 */

const RIVAL_SEEDS = [
  "삼성전자-vs-sk하이닉스",
  "삼성전자-vs-애플",
  "naver-vs-카카오",
  "애플-vs-엔비디아",
  "sp500-vs-나스닥100",
];

/**
 * @description 지금 보고 있는 조합과 관련된 다른 조합을 고른다.
 *
 * 같은 종목이 들어간 사전 생성 슬러그를 우선하고, 모자라면 인기 조합으로 채운다.
 * @param currentCodes - 현재 페이지의 종목 코드 (제외 대상)
 * @param limit - 최대 개수
 */
export const getRelatedComparisons = async (
  currentCodes: string[],
  limit = 12
): Promise<{ label: string; slug: string }[]> => {
  const [slugs, tickerMap] = await Promise.all([
    getPopularSlugs(),
    getTickerMap(),
  ]);

  const slugOf = new Map<string, string>();
  for (const t of tickerMap.values()) slugOf.set(t.slug, t.name);

  const current = new Set(
    currentCodes.map((c) => tickerMap.get(c)?.slug).filter(Boolean) as string[]
  );

  /** 슬러그를 사람이 읽는 라벨로 — 이름을 못 찾으면 링크에서 제외한다 */
  const toLabel = (slug: string): string | null => {
    const parts = slug.split(SEPARATOR);
    const names = parts.map((p) => slugOf.get(p));
    if (names.some((n) => !n)) return null;
    return names.join(" vs ");
  };

  const picked: { label: string; slug: string }[] = [];
  const seen = new Set<string>();

  const push = (slug: string) => {
    if (picked.length >= limit || seen.has(slug)) return;
    const label = toLabel(slug);
    if (!label) return;
    seen.add(slug);
    picked.push({ label, slug });
  };

  // ① 현재 종목이 들어간 다른 조합 — 문맥이 이어져 클릭될 확률이 높다
  if (current.size) {
    for (const slug of slugs) {
      if (!slug.includes(SEPARATOR)) continue;
      const parts = slug.split(SEPARATOR);
      if (parts.length !== 2) continue;
      // 현재 조합과 완전히 같으면 자기 링크라 제외
      if (parts.every((p) => current.has(p))) continue;
      if (parts.some((p) => current.has(p))) push(slug);
      if (picked.length >= limit) break;
    }
  }

  // ② 모자라면 수기 라이벌 조합으로 채운다
  for (const seed of RIVAL_SEEDS) push(seed);

  return picked.slice(0, limit);
};
