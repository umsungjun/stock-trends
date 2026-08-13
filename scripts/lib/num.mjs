/**
 * 숫자 정규화 — 가짜 diff를 막는다.
 *
 * 네이버는 317.015, 334.5699 같은 값을 준다. 조정주가가 재계산될 때 말단 자릿수가 흔들리면
 * 바뀐 게 없는 과거 구간까지 diff에 떠서 주간 커밋이 통째로 부풀고 git 델타가 무의미해진다.
 * 유효숫자 5자리면 상대오차 0.001% 미만이라 차트·CAGR·MDD 어디에도 영향이 없다.
 */

/**
 * @description 유효숫자 n자리로 반올림한다. 정수로 떨어지면 JSON에도 정수로 나가 바이트를 아낀다.
 * @param {number} x
 * @param {number} [n=5] - 유효숫자 자릿수
 * @returns {number}
 */
export const sig = (x, n = 5) =>
  Number.isFinite(x) && x !== 0 ? Number(x.toPrecision(n)) : x;

/** @description 배열 전체에 sig 적용 */
export const sigAll = (arr, n = 5) => arr.map((v) => (v == null ? null : sig(v, n)));
