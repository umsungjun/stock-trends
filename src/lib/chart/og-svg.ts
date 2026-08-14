import {
  type ChartLayout,
  buildLinePath,
  buildScales,
  chartLayout,
} from "@/lib/chart/geometry";
import { slotHex } from "@/lib/chart/palette";
import type { ComputedRow } from "@/lib/market/compute";

/**
 * OG 이미지용 차트 SVG 문자열.
 *
 * 화면과 **같은 geometry 함수**를 쓴다 — 차트를 두 번 작성하지 않는 것이 이 모듈의 목적이다.
 * 다만 색은 리터럴 hex를 쓴다: satori는 CSS 변수를 해석하지 못한다.
 * (compute에서 색을 떼어내고 palette가 cssVar와 hex를 각각 제공하는 이유가 이것이다)
 */

interface OgChartOptions {
  rows: ComputedRow[];
  slots: Record<string, number>;
  amount: number;
  width?: number;
  height?: number;
}

/**
 * @description 계열 선과 원금 기준선만 담은 미니어처 SVG를 만든다.
 * 축·라벨은 넣지 않는다 — OG 이미지는 작게 표시되므로 형태만 읽히면 된다.
 * @param options.rows - 계산된 계열
 * @param options.slots - 코드별 색 슬롯
 * @param options.amount - 투자 원금 (기준선 위치)
 * @returns SVG 문자열
 */
export const buildOgChartSvg = ({
  rows,
  slots,
  amount,
  width = 1000,
  height = 260,
}: OgChartOptions): string => {
  // 여백을 직접 잡는다 — 화면용 레이아웃은 축 라벨 자리를 비워두기 때문
  const layout: ChartLayout = {
    width,
    height,
    narrow: false,
    x0: 0,
    x1: width,
    y0: 8,
    y1: height - 8,
  };
  const scales = buildScales(rows, layout, amount);
  const baseY = scales.sy(amount);

  const lines = rows
    .map(
      (r) =>
        `<path d="${buildLinePath(r.values, scales)}" fill="none" stroke="${slotHex(
          slots[r.code] ?? 0
        )}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<line x1="0" x2="${width}" y1="${baseY.toFixed(1)}" y2="${baseY.toFixed(1)}" stroke="#c7cad0" stroke-width="2" stroke-dasharray="6 6"/>
${lines}
</svg>`;
};

/** @description satori가 <img>로 읽을 수 있게 data URI로 감싼다 (SVG 직접 렌더는 지원 범위가 좁다) */
export const toDataUri = (svg: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export { chartLayout };
