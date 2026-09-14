/**
 * 과거 구간 변경이 코퍼레이트 액션인지 소스 이상인지 가르는 판정.
 *
 * verify.mjs의 재작성 게이트가 쓴다. 별도 모듈로 둔 이유는 회귀 테스트를 붙이기 위함이다 —
 * verify.mjs는 import 즉시 전체 검증이 도는 실행 스크립트라 테스트에서 부를 수 없다.
 */

/** 유효숫자 5자리 반올림이 저가주에서 만드는 비율 편차를 흡수하는 폭 */
export const RESCALE_TOLERANCE = 0.01;

/**
 * @description 과거 구간이 통째로 같은 비율로 곱해졌는지 판정한다.
 *
 * 액면분할·무상증자는 조정계수가 전 구간에 균일하게 곱해지므로 정규화 수익률이 보존된다.
 * 차트가 답하는 "그때 넣었으면 지금 얼마"가 그대로이므로 재작성으로 셀 이유가 없다.
 * 소스가 값을 실제로 다시 계산한 경우(배당 반영 시작·집계 버그)는 비율이 흔들려 여기서 걸린다.
 * @param {number[]} prev - 이전 커밋의 종가 배열
 * @param {number[]} curr - 새로 수집한 종가 배열
 * @param {number} head - 비교 대상 구간 길이 (꼬리 재집계분은 이미 제외돼 있다)
 * @returns {boolean}
 */
export const isUniformRescale = (prev, curr, head) => {
  if (head < 2) return false; // 표본이 모자라면 균일이라고 단정하지 않는다

  const ratios = [];
  for (let i = 0; i < head; i++) {
    const r = curr[i] / prev[i];
    if (!Number.isFinite(r) || r <= 0) return false;
    ratios.push(r);
  }

  // 첫 값은 가장 오래된 저가 구간이라 반올림 오차가 가장 크다 — 기준은 중앙값으로 잡는다
  const base = [...ratios].sort((a, b) => a - b)[ratios.length >> 1];
  return ratios.every((r) => Math.abs(r / base - 1) <= RESCALE_TOLERANCE);
};
