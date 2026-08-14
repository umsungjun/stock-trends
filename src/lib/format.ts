/**
 * 표시 포맷 — 프로토타입(index.html)에서 그대로 이식.
 * 순수 함수라 서버·클라이언트·OG 이미지 세 곳이 공유한다.
 */

/**
 * @description 금액을 축약 표기한다. 억 단위는 유효숫자를 줄여 축 라벨이 길어지지 않게 한다.
 * @param v - 원화 금액
 * @returns "3.24억" | "5,000만" | "12,345"
 */
export const won = (v: number): string => {
  if (v >= 1e8) {
    const eok = v / 1e8;
    const s = eok >= 10 ? eok.toFixed(1) : eok.toFixed(2);
    return `${s.replace(/0+$/, "").replace(/\.$/, "")}억`;
  }
  if (v >= 1e4) return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만`;
  return Math.round(v).toLocaleString("ko-KR");
};

/** @description 전체 자릿수 원화 표기. 툴팁·표처럼 정확한 값이 필요한 곳에 쓴다 */
export const wonFull = (v: number): string =>
  `${Math.round(v).toLocaleString("ko-KR")}원`;

/**
 * @description 비율을 부호 포함 퍼센트로. 수익률이 0 이상이면 +를 붙여 방향이 바로 읽히게 한다.
 * @param v - 비율 (0.1 = 10%)
 * @param digits - 소수 자릿수
 */
export const pct = (v: number, digits = 1): string =>
  `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;

/** @description 퍼센트포인트 표기 — 환율 기여분처럼 비율의 차이를 나타낼 때 */
export const pp = (v: number, digits = 1): string =>
  `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%p`;

/** @description "20260807" → "2026.08" */
export const ym = (ymd: string): string =>
  `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}`;

/** @description "20260807" → "2026.08.07" */
export const ymd = (v: string): string =>
  `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6, 8)}`;

/** @description "20260807" → "2026" */
export const year = (v: string): string => v.slice(0, 4);
