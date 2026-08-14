/**
 * 서버·클라이언트 공용 상수.
 *
 * "use client" 모듈에서 값을 export하면 서버가 import했을 때 클라이언트 참조로 바뀌어
 * undefined가 된다. 양쪽이 함께 쓰는 상수는 반드시 이런 중립 모듈에 둔다.
 */
import type { PeriodId } from "@/types/market";

export const DEFAULT_PERIOD: PeriodId = "10y";
export const DEFAULT_AMOUNT = 100_000_000;

/** 투자금 프리셋. "직접"은 입력창을 연다 */
export const AMOUNTS = [
  { id: "1000", label: "1천만", value: 10_000_000 },
  { id: "5000", label: "5천만", value: 50_000_000 },
  { id: "10000", label: "1억", value: 100_000_000 },
] as const;

/** 첫 화면 기본 조합 — 한국·미국을 하나씩 둬서 환율 기여분 열이 바로 보인다 */
export const DEFAULT_CODES = ["005930", "AAPL"];
