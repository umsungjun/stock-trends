/**
 * 네이버 금융 국내 시세 어댑터.
 *
 * 반환 계약: fetchSeries(code, opts) → { weekKeys, closes, lastTradeDates }
 * 어댑터가 자기 시장의 날짜 관례를 흡수해 나가므로 fetch.mjs는 시장 차이를 몰라도 된다.
 *
 * 국내 주봉 바의 날짜는 "그 주의 마지막 거래일"이다 (20260807=금, 20260813=목).
 * ISO 주차로 그대로 매핑하면 맞는다 — 미국과 달리 보정이 필요 없다.
 *
 * 주의: 네이버 수정주가는 액면분할·유무상증자만 보정하고 배당은 반영하지 않는다.
 */

import { fetchText } from "../lib/http.mjs";
import { isoWeekKey } from "../lib/week.mjs";

const ENDPOINT = "https://api.finance.naver.com/siseJson.naver";

export const SOURCE_ID = "naver-domestic";
export const MARKET = "KR";
export const CURRENCY = "KRW";
export const INCLUDES_DIVIDEND = false;

/** 네이버는 JSON이 아니라 작은따옴표 섞인 JS 리터럴을 반환한다 — 정규화 후 파싱 */
const parseLoose = (text) => {
  const normalized = text.replace(/'/g, '"').replace(/\s+/g, "");
  if (!normalized.startsWith("[")) throw new Error(`예상 밖 응답: ${text.slice(0, 80)}`);
  return JSON.parse(normalized);
};

/**
 * @description 국내 종목의 주간 수정 종가를 받는다.
 * @param {string} code - 6자리 종목코드
 * @param {{from?: string, to?: string, retries?: number}} [opts]
 * @returns {Promise<{weekKeys: string[], closes: number[], lastTradeDates: string[]}>}
 */
export const fetchSeries = async (code, opts = {}) => {
  const { from = "20000101", to = todayYmd(), retries = 3 } = opts;
  const url = `${ENDPOINT}?symbol=${code}&requestType=1&startTime=${from}&endTime=${to}&timeframe=week`;
  const rows = parseLoose(await fetchText(url, { retries }));

  const weekKeys = [];
  const closes = [];
  const lastTradeDates = [];

  // 첫 행은 헤더(['날짜','시가',...]), 이후가 데이터
  for (const row of rows.slice(1)) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const close = Number(row[4]);
    if (!Number.isFinite(close) || close <= 0) continue; // 거래정지 구간 방어
    const date = String(row[0]);
    weekKeys.push(isoWeekKey(date));
    closes.push(close);
    lastTradeDates.push(date);
  }

  if (!closes.length) throw new Error(`${code} 데이터 0건`);
  return { weekKeys, closes, lastTradeDates };
};

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
