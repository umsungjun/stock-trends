/**
 * 차트 좌표 계산 — DOM 의존 0.
 *
 * "차트를 직접 그린다"의 의미를 여기서 재정의한다. geometry가 순수 함수라
 * ValueChart는 이 결과를 JSX로 옮기기만 하는 얇은 층이 되고, OG 이미지 생성기가
 * **같은 함수**로 SVG 문자열을 만든다. 차트를 두 번 작성하지 않는 것이 핵심이다.
 *
 * 값은 프로토타입(index.html renderChart)에서 그대로 이식했다.
 */
import type { ComputedRow } from "@/lib/market/compute";

export interface ChartLayout {
  width: number;
  height: number;
  narrow: boolean;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Scales {
  lo: number;
  hi: number;
  n: number;
  /** 그리드 인덱스 → x 좌표 */
  sx: (i: number) => number;
  /** 값 → y 좌표 */
  sy: (v: number) => number;
}

export interface EndLabel {
  code: string;
  slot: number;
  /** 선 끝점의 실제 y (점을 찍는 위치) */
  anchorY: number;
  /** 충돌 회피 후 라벨을 놓을 y */
  labelY: number;
  x: number;
  final: number;
}

export interface XLabel {
  i: number;
  text: string;
  x: number;
}

const NARROW_BREAKPOINT = 620;

/**
 * @description 폭에 따른 레이아웃. 좁은 화면에서는 끝점 라벨 공간(우측 여백)을 없앤다.
 * @param width - 컨테이너 폭 px
 */
export const chartLayout = (width: number): ChartLayout => {
  const narrow = width < NARROW_BREAKPOINT;
  const height = narrow ? 288 : 392;
  const pad = narrow
    ? { t: 16, r: 16, b: 26, l: 46 }
    : { t: 18, r: 120, b: 28, l: 62 };

  return {
    width,
    height,
    narrow,
    x0: pad.l,
    x1: width - pad.r,
    y0: pad.t,
    y1: height - pad.b,
  };
};

/**
 * @description 값 범위와 좌표 변환 함수를 만든다.
 * 원금선이 항상 보이도록 amount를 범위에 포함시킨다 — 손실 구간이 잘려 안 보이면 안 된다.
 * @param rows - 계산된 계열
 * @param layout - chartLayout 결과
 * @param amount - 투자 원금
 */
export const buildScales = (
  rows: ComputedRow[],
  layout: ChartLayout,
  amount: number
): Scales => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    for (const v of r.values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) {
    lo = amount;
    hi = amount;
  }
  lo = Math.min(lo, amount);
  hi = Math.max(hi, amount);

  const padY = (hi - lo) * 0.09 || hi * 0.1;
  lo -= padY;
  hi += padY;

  const n = rows[0]?.values.length ?? 0;
  const { x0, x1, y0, y1 } = layout;

  return {
    lo,
    hi,
    n,
    sx: (i) => (n <= 1 ? x0 : x0 + (i / (n - 1)) * (x1 - x0)),
    sy: (v) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0),
  };
};

/**
 * @description 사람이 읽기 좋은 축 눈금 값을 고른다 (1·2·5·10 계열).
 * @param min - 하한
 * @param max - 상한
 * @param count - 목표 눈금 수
 */
export const buildTicks = (min: number, max: number, count = 4): number[] => {
  const span = max - min;
  if (span <= 0) return [min];

  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;

  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-6; v += step) {
    out.push(v);
  }
  return out;
};

/** @description 계열 하나의 SVG path `d` 문자열 */
export const buildLinePath = (values: number[], scales: Scales): string =>
  values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${scales.sx(i).toFixed(1)} ${scales.sy(v).toFixed(1)}`
    )
    .join(" ");

const LABEL_MIN_GAP = 15;

/**
 * @description 끝점 직접 라벨의 위치를 정하고 겹침을 해소한다.
 *
 * 라이트 모드에서 계열색 일부가 대비 3:1 아래라, 선 끝에 종목명을 직접 붙이는 것이
 * 색에만 의존하지 않게 하는 보완 장치다. 색각 이상 사용자에게도 필요하다.
 * @param rows - 계산된 계열
 * @param scales - buildScales 결과
 * @param slots - code → 색 슬롯
 * @param layout - 레이아웃 (좁은 화면에서는 빈 배열)
 */
export const placeEndLabels = (
  rows: ComputedRow[],
  scales: Scales,
  slots: Record<string, number>,
  layout: ChartLayout
): EndLabel[] => {
  if (layout.narrow || !rows.length) return [];

  // 값이 큰 것부터 = y가 작은 것부터. 위에서 아래로 훑으며 최소 간격을 확보한다
  const sorted = [...rows].sort((a, b) => b.final - a.final);
  const labels: EndLabel[] = [];
  let prevY = -Infinity;

  for (const r of sorted) {
    const anchorY = scales.sy(r.final);
    const labelY = Math.max(anchorY, prevY + LABEL_MIN_GAP);
    prevY = labelY;
    labels.push({
      code: r.code,
      slot: slots[r.code] ?? 0,
      anchorY,
      labelY,
      x: layout.x1,
      final: r.final,
    });
  }
  return labels;
};

/**
 * @description X축 연도 라벨. 연도가 바뀌는 첫 주차에만 찍고, 촘촘하면 솎아낸다.
 * @param weeks - 전체 주차 라벨 배열 ("YYYYMMDD")
 * @param startIndex - 표시 구간 시작 인덱스
 * @param scales - buildScales 결과
 * @param layout - 레이아웃
 */
export const buildXLabels = (
  weeks: string[],
  startIndex: number,
  scales: Scales,
  layout: ChartLayout
): XLabel[] => {
  const seen = new Set<string>();
  const candidates: { i: number; text: string }[] = [];

  for (let i = 0; i < scales.n; i++) {
    const label = weeks[startIndex + i];
    if (!label) continue;
    const yr = label.slice(0, 4);
    if (seen.has(yr)) continue;
    seen.add(yr);
    candidates.push({ i, text: yr });
  }

  const stride = Math.max(
    1,
    Math.ceil(candidates.length / (layout.narrow ? 4 : 8))
  );

  return candidates
    .filter((_, k) => k % stride === 0 || k === candidates.length - 1)
    .map((c) => ({ ...c, x: scales.sx(c.i) }));
};

/**
 * @description 포인터 x좌표를 그리드 인덱스로 되돌린다. viewBox 스케일을 보정한다.
 * @param clientX - 포인터의 clientX
 * @param rect - SVG 요소의 getBoundingClientRect 결과
 * @param scales - buildScales 결과
 * @param layout - 레이아웃
 * @returns 0 ~ n-1 로 클램프된 인덱스
 */
export const indexFromPointer = (
  clientX: number,
  rect: { left: number; width: number },
  scales: Scales,
  layout: ChartLayout
): number => {
  if (scales.n <= 1) return 0;
  const scale = layout.width / rect.width;
  const px = (clientX - rect.left) * scale;
  const ratio = (px - layout.x0) / (layout.x1 - layout.x0);
  return Math.max(
    0,
    Math.min(scales.n - 1, Math.round(ratio * (scales.n - 1)))
  );
};
