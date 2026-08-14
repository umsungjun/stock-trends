import type { ComputedRow } from "@/lib/market/compute";

import { describe, expect, it } from "vitest";

import {
  buildLinePath,
  buildScales,
  buildTicks,
  buildXLabels,
  chartLayout,
  indexFromPointer,
  placeEndLabels,
} from "@/lib/chart/geometry";

const row = (code: string, values: number[]): ComputedRow => ({
  code,
  market: "KR",
  values,
  final: values[values.length - 1],
  total: 0,
  priceReturn: 0,
  fxReturn: null,
  cagr: 0,
  mdd: 0,
});

const AMOUNT = 100_000_000;

describe("chartLayout", () => {
  it("좁은 화면에서는 끝점 라벨 여백을 없앤다", () => {
    const wide = chartLayout(900);
    const narrow = chartLayout(400);

    expect(wide.narrow).toBe(false);
    expect(narrow.narrow).toBe(true);
    // 넓은 화면은 우측에 라벨 자리(120px)를 비워둔다
    expect(wide.width - wide.x1).toBeGreaterThan(narrow.width - narrow.x1);
  });

  it("플롯 영역이 뒤집히지 않는다", () => {
    for (const w of [320, 620, 900, 1400]) {
      const l = chartLayout(w);
      expect(l.x1).toBeGreaterThan(l.x0);
      expect(l.y1).toBeGreaterThan(l.y0);
    }
  });
});

describe("buildScales", () => {
  const layout = chartLayout(900);

  it("원금이 항상 보이는 범위를 만든다", () => {
    // 전 구간 손실이어도 원금선이 잘려 안 보이면 손실 폭을 읽을 수 없다
    const s = buildScales([row("A", [50e6, 40e6, 30e6])], layout, AMOUNT);
    expect(s.lo).toBeLessThan(30e6);
    expect(s.hi).toBeGreaterThan(AMOUNT);
  });

  it("첫 점은 왼쪽 끝, 마지막 점은 오른쪽 끝", () => {
    const s = buildScales([row("A", [1, 2, 3, 4])], layout, AMOUNT);
    expect(s.sx(0)).toBeCloseTo(layout.x0, 6);
    expect(s.sx(3)).toBeCloseTo(layout.x1, 6);
  });

  it("값이 클수록 y가 작다 (위쪽)", () => {
    const s = buildScales([row("A", [100, 200])], layout, AMOUNT);
    expect(s.sy(200)).toBeLessThan(s.sy(100));
  });

  it("점이 하나뿐이어도 나누기 0이 나지 않는다", () => {
    const s = buildScales([row("A", [AMOUNT])], layout, AMOUNT);
    expect(Number.isFinite(s.sx(0))).toBe(true);
    expect(Number.isFinite(s.sy(AMOUNT))).toBe(true);
  });

  it("계열이 없어도 죽지 않는다", () => {
    const s = buildScales([], layout, AMOUNT);
    expect(s.n).toBe(0);
    expect(Number.isFinite(s.lo)).toBe(true);
  });
});

describe("buildTicks", () => {
  it("1·2·5·10 계열 간격을 쓴다", () => {
    const ticks = buildTicks(0, 100, 4);
    const gap = ticks[1] - ticks[0];
    expect(
      [1, 2, 5, 10, 20, 25, 50].some((g) => Math.abs(gap - g) < 1e-9)
    ).toBe(true);
  });

  it("모든 눈금이 범위 안이다", () => {
    for (const t of buildTicks(1234, 98765, 4)) {
      expect(t).toBeGreaterThanOrEqual(1234);
      expect(t).toBeLessThanOrEqual(98765 + 1e-6);
    }
  });

  it("범위가 0이면 값 하나만 준다", () => {
    expect(buildTicks(100, 100, 4)).toEqual([100]);
  });
});

describe("placeEndLabels — 겹침 해소", () => {
  const layout = chartLayout(900);

  it("가까운 라벨을 최소 간격까지 밀어낸다", () => {
    // 값이 거의 같은 세 계열 — 그대로 두면 글자가 포개진다
    const rows = [
      row("A", [100, 100.0]),
      row("B", [100, 100.1]),
      row("C", [100, 100.2]),
    ];
    const scales = buildScales(rows, layout, 100);
    const labels = placeEndLabels(rows, scales, { A: 0, B: 1, C: 2 }, layout);

    const ys = labels.map((l) => l.labelY).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(15 - 1e-6);
    }
  });

  it("점 위치(anchorY)는 실제 값 그대로 유지한다", () => {
    const rows = [row("A", [100, 200]), row("B", [100, 201])];
    const scales = buildScales(rows, layout, 100);
    const labels = placeEndLabels(rows, scales, { A: 0, B: 1 }, layout);

    for (const l of labels) {
      expect(l.anchorY).toBeCloseTo(scales.sy(l.final), 6);
    }
  });

  it("좁은 화면에서는 라벨을 만들지 않는다", () => {
    const rows = [row("A", [100, 200])];
    const narrow = chartLayout(400);
    const scales = buildScales(rows, narrow, 100);
    expect(placeEndLabels(rows, scales, { A: 0 }, narrow)).toEqual([]);
  });
});

describe("buildXLabels", () => {
  const layout = chartLayout(900);

  it("연도가 바뀌는 첫 주차에만 찍는다", () => {
    const weeks = ["20240105", "20240112", "20250103", "20250110", "20260102"];
    const rows = [row("A", [1, 2, 3, 4, 5])];
    const scales = buildScales(rows, layout, 1);
    const labels = buildXLabels(weeks, 0, scales, layout);

    expect(labels.map((l) => l.text)).toEqual(["2024", "2025", "2026"]);
    expect(labels[0].i).toBe(0);
    expect(labels[1].i).toBe(2);
  });

  it("연도가 많으면 솎아내되 마지막은 남긴다", () => {
    const weeks = Array.from({ length: 30 }, (_, i) => `${2000 + i}0105`);
    const rows = [row("A", new Array(30).fill(1))];
    const scales = buildScales(rows, layout, 1);
    const labels = buildXLabels(weeks, 0, scales, layout);

    expect(labels.length).toBeLessThanOrEqual(9);
    expect(labels[labels.length - 1].text).toBe("2029");
  });

  it("startIndex 오프셋을 반영한다", () => {
    const weeks = ["20240105", "20250105", "20260105"];
    const rows = [row("A", [1, 2])];
    const scales = buildScales(rows, layout, 1);
    const labels = buildXLabels(weeks, 1, scales, layout);
    expect(labels.map((l) => l.text)).toEqual(["2025", "2026"]);
  });
});

describe("indexFromPointer", () => {
  const layout = chartLayout(900);
  const rows = [row("A", [1, 2, 3, 4, 5])];
  const scales = buildScales(rows, layout, 1);
  const rect = { left: 0, width: 900 };

  it("양 끝을 정확히 집는다", () => {
    expect(indexFromPointer(layout.x0, rect, scales, layout)).toBe(0);
    expect(indexFromPointer(layout.x1, rect, scales, layout)).toBe(4);
  });

  it("플롯 밖은 범위 안으로 클램프한다", () => {
    expect(indexFromPointer(-500, rect, scales, layout)).toBe(0);
    expect(indexFromPointer(99999, rect, scales, layout)).toBe(4);
  });

  it("CSS로 축소돼도 viewBox 스케일을 보정한다", () => {
    // 실제 렌더 폭이 450px이어도 viewBox는 900이라 좌표를 2배로 환산해야 한다
    const scaled = { left: 0, width: 450 };
    expect(indexFromPointer(layout.x1 / 2, scaled, scales, layout)).toBe(4);
  });
});

describe("buildLinePath", () => {
  it("M으로 시작해 L로 잇는다", () => {
    const layout = chartLayout(900);
    const rows = [row("A", [100, 200, 150])];
    const scales = buildScales(rows, layout, 100);
    const d = buildLinePath(rows[0].values, scales);

    expect(d.startsWith("M")).toBe(true);
    expect(d.match(/L/g)).toHaveLength(2);
    expect(d).not.toContain("NaN");
  });
});
