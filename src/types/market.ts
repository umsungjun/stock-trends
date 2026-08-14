/** 시장 구분. 미국 종목만 환율 환산 대상이다 */
export type Market = "KR" | "US";

/** 종목 분류. 우선주·리츠는 검색 후순위로 밀되 비교는 가능하다 */
export type TickerKind = "주식" | "우선주" | "리츠" | "ETF";

export type PeriodId = "1y" | "3y" | "5y" | "10y" | "max";

/** tickers.json의 한 항목 — 바이트를 아끼려고 키를 한 글자로 줄여 굽는다 */
export interface RawTicker {
  /** code — 앱 전역 코드이자 파일명 */
  c: string;
  /** name — 표시명 */
  n: string;
  /** slug — 빌드 타임에 확정된 canonical 슬러그 */
  s: string;
  /** kind */
  k: TickerKind;
  /** market */
  m: Market;
  /** offset — 그리드에서 이 종목이 시작하는 인덱스 */
  o: number;
  /** englishName — 미국 종목만 */
  e?: string;
  /** GICS sector — S&P 500 종목만 */
  g?: string;
  /** 0이면 비활성 — 유니버스에서 밀려났지만 직링크는 살아 있다. 기본은 활성이라 필드가 없다 */
  a?: 0;
}

/** 앱에서 다루는 종목 메타 */
export interface Ticker {
  code: string;
  name: string;
  slug: string;
  kind: TickerKind;
  market: Market;
  offset: number;
  englishName?: string;
  sector?: string;
  /** 초성 검색용 — 로드 시 한 번만 계산한다 */
  choseong: string;
  /** 검색에 노출할지. 비활성 종목은 URL 해석만 되고 검색에는 안 뜬다 */
  active: boolean;
}

/** meta.json */
export interface MarketMeta {
  v: number;
  asOfWeek: string;
  asOfDate: string;
  includesDividend: boolean;
  sources: { kr: string; us: string; fx: string };
  /** 주차별 라벨 — 그 주차의 한국장 마지막 거래일 "YYYYMMDD" */
  weeks: string[];
  /** 원/달러. o는 환율이 시작하는 그리드 인덱스 */
  fx: { o: number; v: number[] };
}

/** {code}.json — 현지통화 종가 */
export interface RawSeries {
  c: string;
  o: number;
  v: number[];
  /** 미국 종목만 "USD" */
  cur?: string;
}

/** 계산 입력으로 쓰는 시계열 */
export interface Series {
  code: string;
  offset: number;
  /** 현지통화 종가. 원화 환산은 compute가 한다 */
  values: number[];
  market: Market;
}
