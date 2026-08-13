/**
 * 한국은행 ECOS 원/달러 환율 어댑터 — 2차 소스. 정식 API 키가 필요하다.
 *
 * 네이버가 2007년경까지만 거슬러 올라가므로, 한국 종목의 달러 환산을 2000년까지
 * 지원하려는 경우에만 쓴다. 미국 시세가 2010년부터라 미국 환산에는 불필요하다.
 *
 * 통계표 731Y001 / 항목 0000001 = 원/미국달러(매매기준율), 주기 D(일별).
 * 샘플키 "sample"은 정확히 10건만 준다(ERROR-301) — 부트스트랩에는 못 쓴다.
 */

import { fetchJson } from "../lib/http.mjs";

const ENDPOINT = "https://ecos.bok.or.kr/api/StatisticSearch";

export const SOURCE_ID = "ecos";
export const RATE_BASIS = "한국은행 매매기준율";

const CHUNK = 5_000; // 한 요청당 상한

/**
 * @description ECOS에서 일별 매매기준율을 받는다.
 * @param {{from: string, to: string, apiKey: string}} opts - from/to는 "YYYYMMDD"
 * @returns {Promise<Array<{date: string, rate: number}>>} 날짜 오름차순
 */
export const fetchDailyFx = async ({ from, to, apiKey }) => {
  if (!apiKey) throw new Error("ECOS_API_KEY 없음");

  const out = [];
  for (let start = 1; ; start += CHUNK) {
    const url = `${ENDPOINT}/${apiKey}/json/kr/${start}/${start + CHUNK - 1}/731Y001/D/${from}/${to}/0000001`;
    const d = await fetchJson(url);

    if (d?.RESULT?.CODE) {
      // INFO-200 = 데이터 없음. 그 외는 키·파라미터 문제라 던진다
      if (d.RESULT.CODE === "INFO-200") break;
      throw new Error(`ECOS ${d.RESULT.CODE}: ${d.RESULT.MESSAGE}`);
    }

    const rows = d?.StatisticSearch?.row ?? [];
    if (!rows.length) break;

    for (const r of rows) {
      const rate = Number(r.DATA_VALUE);
      if (Number.isFinite(rate) && rate > 0) out.push({ date: r.TIME, rate });
    }
    if (rows.length < CHUNK) break;
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
};
