/**
 * rescale.mjs 회귀 테스트 — node --test tests/scripts/rescale.test.mjs
 *
 * verify.mjs의 재작성 게이트가 액면분할을 소스 버그로 오인하면 커밋이 막히고,
 * 막힌 다음 주에는 변경이 누적돼 더 확실히 막힌다. 한 번 걸리면 사람이 손대기 전까지
 * 빠져나오지 못하는 구조라 이 판정은 양쪽 방향 모두 못 박아 둔다.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUniformRescale } from "../../scripts/lib/rescale.mjs";

/** 전 구간에 같은 계수를 곱한다 — 액면분할·무상증자가 만드는 모양 */
const scaled = (arr, k) => arr.map((v) => v * k);

describe("isUniformRescale — 통과시켜야 하는 것", () => {
  const base = [425, 260, 284, 284, 253, 300, 512, 990];

  it("정확한 2:1 액면분할을 균일로 본다", () => {
    assert.equal(isUniformRescale(base, scaled(base, 2), base.length), true);
  });

  it("10:1 분할과 0.5배 병합 모두 균일로 본다", () => {
    assert.equal(isUniformRescale(base, scaled(base, 10), base.length), true);
    assert.equal(isUniformRescale(base, scaled(base, 0.5), base.length), true);
  });

  it("1.2배 무상증자처럼 정수가 아닌 계수도 균일로 본다", () => {
    assert.equal(isUniformRescale(base, scaled(base, 1.2005), base.length), true);
  });

  it("저가주 반올림 편차를 흡수한다", () => {
    // 실제 사례: 023760이 425→848로 조정되며 비율이 1.9843~2.0으로 흔들렸다.
    // 유효숫자 5자리 반올림 탓이지 소스가 값을 다시 계산한 것이 아니다
    const prev = [425, 260, 284, 284, 253];
    const curr = [848, 518, 566, 566, 506];
    assert.equal(isUniformRescale(prev, curr, prev.length), true);
  });
});

describe("isUniformRescale — 걸러내야 하는 것", () => {
  it("한 구간만 값이 달라지면 균일이 아니다", () => {
    const prev = [100, 200, 300, 400, 500, 600];
    const curr = [200, 400, 600, 800, 900, 1200]; // 다섯째만 비율 1.8로 어긋난다
    assert.equal(isUniformRescale(prev, curr, prev.length), false);
  });

  it("비율이 서서히 드리프트하면 균일이 아니다 — 배당 반영 시작이 이 모양이다", () => {
    const prev = [100, 100, 100, 100, 100, 100];
    const curr = [100, 102, 104, 106, 108, 110];
    assert.equal(isUniformRescale(prev, curr, prev.length), false);
  });

  it("허용 폭 1%를 넘는 편차는 균일이 아니다", () => {
    const prev = [1000, 1000, 1000, 1000];
    const curr = [2000, 2000, 2000, 2040]; // 마지막만 2% 초과
    assert.equal(isUniformRescale(prev, curr, prev.length), false);
  });

  it("0이나 음수·결측이 섞이면 판정하지 않는다", () => {
    assert.equal(isUniformRescale([100, 0, 100], [200, 0, 200], 3), false);
    assert.equal(isUniformRescale([100, 100, 100], [200, 200], 3), false);
  });

  it("표본이 2개 미만이면 균일이라고 단정하지 않는다", () => {
    assert.equal(isUniformRescale([100], [200], 1), false);
    assert.equal(isUniformRescale([100, 100], [200, 200], 0), false);
  });
});
