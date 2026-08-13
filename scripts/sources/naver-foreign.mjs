/**
 * 네이버 금융 해외(미국) 시세 어댑터.
 *
 * ⚠️ 미국 주봉 바의 localDate는 "그 주의 일요일"(주 시작 앵커)이다.
 *    20260809(일)가 실제로 커버하는 거래주는 8/10~8/14 = 2026-W33인데,
 *    isoWeekKey("20260809")는 W32를 준다. 반드시 +1일 후 계산해야 한국 바와 맞는다.
 *
 *    보정을 빠뜨리면 미국 계열 전체가 한 주씩 밀린 채 차트가 "대충 맞아 보여서" 발견이 늦는다.
 *    scripts/lib/week.test.mjs가 이 규칙을 회귀 테스트로 못 박고 있다.
 *
 * 심볼 규칙 (실측):
 *   NASDAQ  → `.O` 접미사 필수     NVDA.O, AAPL.O, QQQ.O
 *   NYSE    → 접미사 없음          JPM, LLY  (JPM.N은 실패)
 *   AMEX    → 일부 `.K`            CBOE.K, PHYS.K / SPY, VOO는 접미사 없음
 *   클래스주 → 점 제거 + 소문자     BRK.B → BRKb, BRK.A → BRKa
 */

import { fetchJson } from "../lib/http.mjs";
import { addDays, isoWeekKey } from "../lib/week.mjs";

const CHART = "https://api.stock.naver.com/chart/foreign/item";
const BASIC = "https://api.stock.naver.com/stock";

export const SOURCE_ID = "naver-foreign";
export const MARKET = "US";
export const CURRENCY = "USD";
export const INCLUDES_DIVIDEND = false;

const stamp = (ymd) => `${ymd}0000`;

/**
 * @description 미국 종목의 주간 수정 종가를 받는다. 일요일 앵커를 ISO 주차로 보정해 내보낸다.
 * @param {string} reutersCode - 네이버 심볼 ("NVDA.O" | "SPY" | "BRKb")
 * @param {{from?: string, to?: string, retries?: number}} [opts]
 * @returns {Promise<{weekKeys: string[], closes: number[], lastTradeDates: string[]}>}
 */
export const fetchSeries = async (reutersCode, opts = {}) => {
  const { from = "20000101", to = todayYmd(), retries = 3 } = opts;
  const url = `${CHART}/${encodeURIComponent(reutersCode)}/week?startDateTime=${stamp(from)}&endDateTime=${stamp(to)}`;
  const rows = await fetchJson(url, { retries, headers: { Referer: "https://m.stock.naver.com/" } });

  if (!Array.isArray(rows)) throw new Error(`${reutersCode} 예상 밖 응답`);

  const weekKeys = [];
  const closes = [];
  const lastTradeDates = [];

  for (const row of rows) {
    const close = Number(row?.closePrice);
    if (!Number.isFinite(close) || close <= 0) continue;
    const anchor = String(row.localDate);
    // 핵심 보정 — 일요일 앵커를 다음날(월)로 옮겨야 그 주의 ISO 주차가 나온다
    weekKeys.push(isoWeekKey(addDays(anchor, 1)));
    closes.push(close);
    lastTradeDates.push(anchor);
  }

  if (!closes.length) throw new Error(`${reutersCode} 데이터 0건`);
  return { weekKeys, closes, lastTradeDates };
};

/**
 * @description 종목 표시명을 받는다. 개별주는 한글명이 오고 ETF는 영문명이 온다.
 * @param {string} reutersCode
 * @returns {Promise<{name: string, englishName: string, exchange: string} | null>}
 */
export const fetchBasic = async (reutersCode) => {
  try {
    const d = await fetchJson(`${BASIC}/${encodeURIComponent(reutersCode)}/basic`, {
      retries: 2,
      headers: { Referer: "https://m.stock.naver.com/" },
    });
    if (!d?.stockName) return null;
    return {
      name: d.stockName,
      englishName: d.stockNameEng ?? d.stockName,
      exchange: d.stockExchangeName ?? "",
    };
  } catch {
    return null;
  }
};

/**
 * @description 심볼을 네이버가 받아들이는 형태로 변환한다. 점이 든 클래스주는 소문자 접미사가 된다.
 * @param {string} symbol - "BRK.B" | "AAPL"
 * @returns {string} "BRKb" | "AAPL"
 */
export const normalizeSymbol = (symbol) =>
  symbol.replace(/\.([A-Z])$/, (_, cls) => cls.toLowerCase());

/**
 * @description 접미사 후보를 시도 순서대로 돌려준다. 거래소 목록 API가 reutersCode를 주는
 * 개별주에는 쓰이지 않고, 목록 API가 다루지 않는 ETF에만 필요하다.
 *
 * 거래소 힌트는 순서 조정에만 쓰고 후보를 줄이지 않는다 — 실측상 힌트가 어긋난다.
 * (SCHD는 NASDAQ 상장인데 네이버 심볼은 SCHD.K)
 * @param {string} symbol
 * @param {"NASDAQ"|"NYSE"|"AMEX"|undefined} [exchange]
 * @returns {string[]} 시도 순서
 */
export const resolveCandidates = (symbol, exchange) => {
  const bare = normalizeSymbol(symbol);
  const all = [bare, `${bare}.O`, `${bare}.K`];
  // 나스닥은 .O가 맞는 비율이 높아 먼저 시도해 요청 수를 줄인다
  return exchange === "NASDAQ" ? [`${bare}.O`, bare, `${bare}.K`] : all;
};

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
