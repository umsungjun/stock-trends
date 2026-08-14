import type { Series } from "@/types/market";

import { describe, expect, it } from "vitest";

import {
  PERIODS,
  WEEKS_PER_YEAR,
  compute,
  computeRows,
  resolveRange,
} from "@/lib/market/compute";

/** 그리드 길이 */
const N = 600;
const AMOUNT = 100_000_000;

/** 일정 비율로 자라는 시계열 */
const grow = (
  code: string,
  market: "KR" | "US",
  offset: number,
  start: number,
  end: number,
  len = N - offset
): Series => {
  const ratio = Math.pow(end / start, 1 / (len - 1));
  return {
    code,
    market,
    offset,
    values: Array.from({ length: len }, (_, i) => start * Math.pow(ratio, i)),
  };
};

const flatFx = (rate: number, o = 0): { o: number; v: number[] } => ({
  o,
  v: new Array(N - o).fill(rate),
});

describe("resolveRange", () => {
  const fx = flatFx(1200);

  it("요청 기간만큼 뒤에서부터 자른다", () => {
    const s = [grow("A", "KR", 0, 100, 200)];
    const r = resolveRange(s, "1y", N, fx);
    expect(r.end).toBe(N - 1);
    expect(r.start).toBe(N - 1 - 52);
    expect(r.clamped).toBe(false);
  });

  it("상장이 늦은 종목이 있으면 그 시점으로 좁히고 원인을 알려준다", () => {
    const s = [grow("A", "KR", 0, 100, 200), grow("LATE", "KR", 580, 50, 60)];
    const r = resolveRange(s, "10y", N, fx);
    expect(r.start).toBe(580);
    expect(r.clamped).toBe(true);
    expect(r.reason).toBe("listing");
    expect(r.byCode).toBe("LATE");
  });

  it("미국 종목이 있으면 환율 시작 이전으로는 갈 수 없다", () => {
    const s = [grow("US1", "US", 0, 10, 20)];
    const r = resolveRange(s, "max", N, flatFx(1200, 223));
    expect(r.start).toBe(223);
    expect(r.reason).toBe("fx");
  });

  it("한국 종목만 있으면 환율 시작에 걸리지 않는다", () => {
    const s = [grow("A", "KR", 0, 100, 200)];
    const r = resolveRange(s, "max", N, flatFx(1200, 223));
    expect(r.start).toBe(0);
    expect(r.reason).toBe(null);
  });

  it("전체 기간은 그리드 처음부터", () => {
    expect(PERIODS.find((p) => p.id === "max")?.weeks).toBe(Infinity);
    const r = resolveRange([grow("A", "KR", 0, 100, 200)], "max", N, fx);
    expect(r.start).toBe(0);
  });
});

describe("computeRows — 원화 평가액", () => {
  it("한국 종목은 주가 배수를 그대로 반영한다", () => {
    const s = [grow("A", "KR", 0, 100, 300)];
    const range = resolveRange(s, "max", N, flatFx(1200));
    const [row] = computeRows(s, range, AMOUNT, flatFx(1200));

    expect(row.final).toBeCloseTo(AMOUNT * 3, 0);
    expect(row.total).toBeCloseTo(2, 6);
    expect(row.fxReturn).toBeNull();
    expect(row.values[0]).toBeCloseTo(AMOUNT, 6);
  });

  it("환율이 고정이면 미국 종목도 주가 배수만 반영된다", () => {
    const s = [grow("U", "US", 0, 10, 30)];
    const range = resolveRange(s, "max", N, flatFx(1200));
    const [row] = computeRows(s, range, AMOUNT, flatFx(1200));

    expect(row.final).toBeCloseTo(AMOUNT * 3, 0);
    expect(row.fxReturn).toBeCloseTo(0, 9);
  });
});

describe("환율은 시점별로 적용된다 — 오늘 환율 고정이 아니다", () => {
  /** 환율이 1,100 → 1,400으로 오르는 시계열 */
  const risingFx = () => ({
    o: 0,
    v: Array.from({ length: N }, (_, i) => 1100 + (300 * i) / (N - 1)),
  });

  it("주가 3배 + 환율 상승분이 함께 반영된다", () => {
    const s = [grow("U", "US", 0, 10, 30)];
    const fx = risingFx();
    const range = resolveRange(s, "max", N, fx);
    const [row] = computeRows(s, range, AMOUNT, fx);

    // 시점별: 3배 × (1400/1100) = 3.818배
    expect(row.final / AMOUNT).toBeCloseTo(3 * (1400 / 1100), 6);
    // 오늘 환율을 전 구간에 곱했다면 3.0배에 그친다 — 그 값이 나오면 잘못 구현된 것
    expect(row.final / AMOUNT).not.toBeCloseTo(3, 2);
  });

  it("총수익률이 주가수익률 × 환율수익률로 분해된다", () => {
    const s = [grow("U", "US", 0, 10, 30)];
    const fx = risingFx();
    const range = resolveRange(s, "max", N, fx);
    const [row] = computeRows(s, range, AMOUNT, fx);

    expect(row.priceReturn).toBeCloseTo(2, 6); // +200%
    expect(row.fxReturn).toBeCloseTo(1400 / 1100 - 1, 6); // 약 +27.3%
    expect((1 + row.priceReturn) * (1 + row.fxReturn!) - 1).toBeCloseTo(
      row.total,
      6
    );
  });

  it("환율이 떨어지면 원화 수익률이 주가 수익률보다 낮아진다", () => {
    const s = [grow("U", "US", 0, 10, 20)];
    const fallingFx = {
      o: 0,
      v: Array.from({ length: N }, (_, i) => 1400 - (300 * i) / (N - 1)),
    };
    const range = resolveRange(s, "max", N, fallingFx);
    const [row] = computeRows(s, range, AMOUNT, fallingFx);

    expect(row.priceReturn).toBeCloseTo(1, 6);
    expect(row.total).toBeLessThan(row.priceReturn);
    expect(row.fxReturn!).toBeLessThan(0);
  });
});

describe("CAGR·MDD", () => {
  it("CAGR이 주차 수 기준으로 연환산된다", () => {
    const len = Math.round(WEEKS_PER_YEAR * 2) + 1; // 정확히 2년
    const s: Series[] = [
      {
        code: "A",
        market: "KR",
        offset: N - len,
        values: Array.from(
          { length: len },
          (_, i) => 100 * Math.pow(1.21, i / (len - 1))
        ),
      },
    ];
    const range = resolveRange(s, "max", N, flatFx(1200));
    const [row] = computeRows(s, range, AMOUNT, flatFx(1200));

    expect(row.total).toBeCloseTo(0.21, 4);
    expect(row.cagr).toBeCloseTo(0.1, 3); // 1.21의 2년 CAGR = 10%
  });

  it("MDD는 고점 대비 최대 낙폭을 음수로 준다", () => {
    const s: Series[] = [
      { code: "A", market: "KR", offset: 0, values: [100, 200, 100, 150] },
    ];
    const range = {
      start: 0,
      end: 3,
      clamped: false,
      reason: null,
      byCode: null,
    };
    const [row] = computeRows(s, range, AMOUNT, flatFx(1200));

    expect(row.mdd).toBeCloseTo(-0.5, 6); // 200 → 100
  });

  it("중간 저점이 최종값보다 깊으면 그걸 잡는다", () => {
    const s: Series[] = [
      { code: "A", market: "KR", offset: 0, values: [100, 300, 60, 400] },
    ];
    const range = {
      start: 0,
      end: 3,
      clamped: false,
      reason: null,
      byCode: null,
    };
    const [row] = computeRows(s, range, AMOUNT, flatFx(1200));

    expect(row.total).toBeCloseTo(3, 6); // 최종은 +300%
    expect(row.mdd).toBeCloseTo(-0.8, 6); // 그래도 중간에 -80%를 겪었다
  });
});

describe("compute — 통합", () => {
  it("구간 밖 종목은 결과에서 빠진다", () => {
    const s = [
      grow("A", "KR", 0, 100, 200),
      { code: "EMPTY", market: "KR" as const, offset: 599, values: [] },
    ];
    const { rows } = compute(s, "max", AMOUNT, N, flatFx(1200));
    expect(rows.map((r) => r.code)).toEqual(["A"]);
  });

  it("모든 계열의 시작 평가액이 원금과 같다", () => {
    const s = [grow("A", "KR", 0, 100, 200), grow("U", "US", 0, 10, 40)];
    const { rows } = compute(s, "5y", AMOUNT, N, flatFx(1300));
    for (const r of rows) expect(r.values[0]).toBeCloseTo(AMOUNT, 6);
  });
});
