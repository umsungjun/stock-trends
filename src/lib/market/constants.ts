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

/**
 * 빈 화면에서 클릭 한 번으로 담는 추천 종목.
 *
 * 첫 화면을 기본 조합으로 채우지 않는 이유는 URL 대칭이다 — `/`가 "종목 없음"을 뜻해야
 * 종목을 다 지운 뒤 새로고침해도 같은 상태로 돌아온다. 대신 시작점을 칩으로 준다.
 * 한국·미국, 개별주·지수 ETF를 섞어 환율 기여분 열이 바로 보이게 했다.
 */
export const STARTER_CODES = ["005930", "000660", "AAPL", "NVDA", "SPY", "QQQ"];
