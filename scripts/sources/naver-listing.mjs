/**
 * 종목 목록 어댑터 — 유니버스 생성 입력.
 *
 * 미국 목록 API가 시총 정렬 + reutersCode 확정값 + 한국어명을 한 번에 주므로
 * 접미사 순회 probe가 필요 없다. (NASDAQ 3,968 / NYSE 2,798 / AMEX 316)
 *
 * 주의: 한국 목록에는 ETF와 우선주가 섞여 나온다 (KODEX 200, 삼성전자우).
 *       걸러내는 책임은 universe/rules.mjs에 있다.
 */

import { fetchJson, fetchText } from "../lib/http.mjs";

const US_LIST = "https://api.stock.naver.com/stock/exchange";
const KR_LIST = "https://m.stock.naver.com/api/stocks/marketValue";
const KR_ETF = "https://finance.naver.com/api/sise/etfItemList.nhn";

const PAGE_SIZE = 100; // 두 API 공통 상한

/** 쉼표 낀 숫자 문자열 → number. 파싱 실패는 0으로 (정렬만 쓰므로 치명적이지 않다) */
const num = (s) => Number(String(s ?? "").replace(/[^0-9.]/g, "")) || 0;

/**
 * @description 미국 거래소의 시총 상위 종목을 받는다.
 * @param {"NASDAQ"|"NYSE"|"AMEX"} exchange
 * @param {number} limit - 받을 종목 수
 * @returns {Promise<Array<{symbol: string, reutersCode: string, name: string, nameEng: string, exchange: string, marketValue: number}>>}
 */
export const fetchUsListing = async (exchange, limit) => {
  const out = [];
  for (let page = 1; out.length < limit; page++) {
    const d = await fetchJson(`${US_LIST}/${exchange}/marketValue?page=${page}&pageSize=${PAGE_SIZE}`, {
      headers: { Referer: "https://m.stock.naver.com/" },
    });
    const rows = d?.stocks ?? [];
    if (!rows.length) break;

    for (const s of rows) {
      if (s.stockEndType !== "stock" || !s.reutersCode) continue;
      out.push({
        symbol: s.symbolCode ?? s.reutersCode,
        reutersCode: s.reutersCode,
        name: s.stockName,
        nameEng: s.stockNameEng ?? s.stockName,
        exchange,
        marketValue: num(s.marketValue),
      });
      if (out.length >= limit) break;
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
};

/**
 * @description 국내 시장의 시총 상위 종목을 받는다. ETF·우선주가 섞여 있으므로 호출부에서 걸러야 한다.
 * @param {"KOSPI"|"KOSDAQ"} market
 * @param {number} limit
 * @returns {Promise<Array<{code: string, name: string, market: string, endType: string, marketValue: number}>>}
 */
export const fetchKrListing = async (market, limit) => {
  const out = [];
  for (let page = 1; out.length < limit; page++) {
    const d = await fetchJson(`${KR_LIST}/${market}?page=${page}&pageSize=${PAGE_SIZE}`);
    const rows = d?.stocks ?? [];
    if (!rows.length) break;

    for (const s of rows) {
      if (!s.itemCode) continue;
      out.push({
        code: s.itemCode,
        name: s.stockName,
        market,
        endType: s.stockEndType, // "stock" | "etf" 등 — 필터링 근거
        marketValue: num(s.marketValue),
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out.slice(0, limit);
};

/**
 * @description 국내 상장 ETF 전체 목록(약 1,163개)을 시총순으로 받는다.
 * 응답이 EUC-KR이라 바이트로 받아 디코딩한다.
 * @param {number} limit
 * @returns {Promise<Array<{code: string, name: string, marketValue: number}>>}
 */
export const fetchKrEtfListing = async (limit) => {
  // fetchText는 UTF-8로 디코딩하므로 여기서는 직접 받아 EUC-KR로 푼다
  const res = await fetch(KR_ETF, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.naver.com/" },
  });
  if (!res.ok) throw new Error(`ETF 목록 HTTP ${res.status}`);
  const text = new TextDecoder("euc-kr").decode(await res.arrayBuffer());
  const items = JSON.parse(text)?.result?.etfItemList ?? [];

  return items
    .map((e) => ({ code: e.itemcode, name: e.itemname, marketValue: Number(e.marketSum) || 0 }))
    .filter((e) => e.code && e.name)
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, limit);
};

/**
 * @description S&P 500 구성종목 + GICS 섹터. 섹터별 비교 조합 사전 생성에도 쓴다.
 * @returns {Promise<Array<{symbol: string, name: string, sector: string}>>}
 */
export const fetchSp500 = async () => {
  const csv = await fetchText(
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
  );
  const [header, ...lines] = csv.trim().split("\n");
  const cols = header.split(",");
  const iSym = cols.indexOf("Symbol");
  const iName = cols.indexOf("Security");
  const iSector = cols.indexOf("GICS Sector");

  return lines
    .map((line) => {
      // 회사명에 쉼표가 들어간 따옴표 필드가 있어 단순 split을 쓸 수 없다
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").trim());
      return cells ? { symbol: cells[iSym], name: cells[iName], sector: cells[iSector] } : null;
    })
    .filter((r) => r?.symbol);
};
