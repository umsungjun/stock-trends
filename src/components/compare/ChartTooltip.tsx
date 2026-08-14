import type { ChartLayout, Scales } from "@/lib/chart/geometry";
import { slotColor } from "@/lib/chart/palette";
import { won, ymd } from "@/lib/format";
import type { ComputedRow } from "@/lib/market/compute";

interface ChartTooltipProps {
  index: number | null;
  rows: ComputedRow[];
  scales: Scales;
  layout: ChartLayout;
  slots: Record<string, number>;
  names: Record<string, string>;
  weeks: string[];
  startIndex: number;
  /** 키보드로 움직일 때만 aria-live를 켠다 */
  live: boolean;
}

/**
 * @description 크로스헤어를 따라다니는 값 툴팁. SVG가 아닌 DOM 오버레이다.
 *
 * 위치는 폭 비율 휴리스틱으로 뒤집는다 — 실제 폭을 재서 결정하면 렌더가 두 번 돌아간다.
 * 툴팁 폭이 거의 고정이라 오차가 없다.
 *
 * aria-live는 키보드 조작일 때만 켠다. pointermove마다 갱신되면 스크린리더가 폭주한다.
 * @param props.index - 강조 중인 인덱스
 * @param props.live - 키보드 조작 여부
 */
export default function ChartTooltip({
  index,
  rows,
  scales,
  layout,
  slots,
  names,
  weeks,
  startIndex,
  live,
}: ChartTooltipProps) {
  if (index === null || !rows.length) return null;

  const px = scales.sx(index);
  const ratio = px / layout.width;
  const flip = ratio > 0.62;
  const label = weeks[startIndex + index];

  const sorted = [...rows].sort(
    (a, b) => (b.values[index] ?? 0) - (a.values[index] ?? 0)
  );

  return (
    <div
      role="status"
      aria-live={live ? "polite" : "off"}
      className="border-hairline bg-field pointer-events-none absolute top-4 z-10 min-w-[168px] border px-2.5 py-2 shadow-sm"
      style={{
        left: `${(ratio * 100).toFixed(3)}%`,
        transform: flip ? "translateX(calc(-100% - 14px))" : "translateX(14px)",
      }}
    >
      <div className="text-ink-muted mb-1.5 text-[11px]">
        {label ? ymd(label) : ""}
      </div>
      {sorted.map((r) => (
        <div
          key={r.code}
          className="flex items-center gap-2 py-[1px] text-[12px]"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0"
            style={{ background: slotColor(slots[r.code] ?? 0) }}
          />
          <span className="tnum font-semibold">
            {won(r.values[index] ?? 0)}
          </span>
          <span className="text-ink-muted ml-auto truncate">
            {names[r.code] ?? r.code}
          </span>
        </div>
      ))}
    </div>
  );
}
