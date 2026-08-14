import type { ChartLayout, Scales } from "@/lib/chart/geometry";
import { slotColor } from "@/lib/chart/palette";
import type { ComputedRow } from "@/lib/market/compute";

interface ChartCrosshairProps {
  index: number | null;
  rows: ComputedRow[];
  scales: Scales;
  layout: ChartLayout;
  slots: Record<string, number>;
}

/**
 * @description 크로스헤어 레이어 — 세로선과 각 계열의 점.
 *
 * hoverIndex에만 의존하도록 본체(ChartBody)에서 떼어냈다. 여기서 다시 계산하는 것은
 * 세로선 x 하나와 점 5개의 cy뿐이라 pointermove마다 리렌더돼도 비용이 없다.
 * @param props.index - 강조할 그리드 인덱스. null이면 숨김
 */
export default function ChartCrosshair({
  index,
  rows,
  scales,
  layout,
  slots,
}: ChartCrosshairProps) {
  if (index === null || !rows.length) return null;

  const x = scales.sx(index);

  return (
    <g pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={layout.y0}
        y2={layout.y1}
        stroke="var(--ink-muted)"
        strokeWidth={1}
      />
      {rows.map((r) => {
        const v = r.values[index];
        if (v === undefined) return null;
        return (
          <circle
            key={r.code}
            cx={x}
            cy={scales.sy(v)}
            r={4.5}
            fill={slotColor(slots[r.code] ?? 0)}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}
