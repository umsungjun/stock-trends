/**
 * 네이버 원/달러 환율 어댑터 — 1차 소스. API 키가 필요 없다.
 *
 * 값이 한국은행 매매기준율과 일치한다. 페이지 한계로 2007년경까지만 거슬러 올라가는데,
 * 미국 시세가 2010년부터라 미국 환산에는 이것으로 충분하다.
 * (한국 종목의 달러 환산을 2000년까지 지원할 때만 ECOS 정식키가 필요하다)
 */

import { fetchJson } from "../lib/http.mjs";

const ENDPOINT = "https://m.stock.naver.com/front-api/marketIndex/prices";

export const SOURCE_ID = "naver";
export const RATE_BASIS = "서울외국환중개 매매기준율";

const PAGE_SIZE = 60; // API 상한 (최소 10)
const MAX_PAGES = 200; // 폭주 방지 — 실제로는 80쪽 근처에서 빈 응답이 온다

/** "2026-08-13" → "20260813" */
const compact = (d) => String(d).replace(/-/g, "");

/**
 * @description 일별 매매기준율을 최신순 페이지로 거슬러 올라가며 받는다.
 * @param {{from: string, stopAt?: string}} opts
 *   from   - "YYYYMMDD". 이 날짜에 도달하면 중단
 *   stopAt - "YYYYMMDD". 이미 캐시된 최신일. 여기 도달하면 조기 중단(증분 수집)
 * @returns {Promise<Array<{date: string, rate: number}>>} 날짜 오름차순
 */
export const fetchDailyFx = async ({ from, stopAt }) => {
  const rows = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const d = await fetchJson(`${ENDPOINT}?category=exchange&reutersCode=FX_USDKRW&page=${page}&pageSize=${PAGE_SIZE}`, {
      headers: { Referer: "https://m.stock.naver.com/" },
    });
    const list = d?.result ?? [];
    if (!list.length) break;

    let reachedEnd = false;
    for (const r of list) {
      const date = compact(r.localTradedAt);
      const rate = Number(String(r.closePrice).replace(/,/g, ""));
      if (!/^\d{8}$/.test(date) || !Number.isFinite(rate) || rate <= 0) continue;
      if (date < from) { reachedEnd = true; break; }
      // 증분 수집: 캐시가 이미 가진 구간에 닿으면 더 받을 필요가 없다
      if (stopAt && date <= stopAt) { reachedEnd = true; break; }
      rows.push({ date, rate });
    }
    if (reachedEnd || list.length < PAGE_SIZE) break;
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
};
