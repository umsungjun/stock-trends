import { memo } from "react";

import {
  type ChartLayout,
  type Scales,
  buildLinePath,
  buildTicks,
  buildXLabels,
} from "@/lib/chart/geometry";
import { placeEndLabels } from "@/lib/chart/geometry";
import { slotColor } from "@/lib/chart/palette";
import { won } from "@/lib/format";
import type { ComputedRow } from "@/lib/market/compute";

interface ChartBodyProps {
  rows: ComputedRow[];
  scales: Scales;
  layout: ChartLayout;
  slots: Record<string, number>;
  names: Record<string, string>;
  weeks: string[];
  startIndex: number;
  amount: number;
}

/**
 * @description 차트의 정적 레이어 — 그리드·원금선·축·선·끝점 라벨.
 *
 * hoverIndex에 의존하지 않아 memo가 실제로 듣는다. 프로토타입은 hover가 바뀔 때마다
 * 전체를 다시 그렸는데, React에서 그대로 하면 pointermove마다 5개 path의 좌표
 * 수백 개를 재계산한다. 크로스헤어를 분리해 그것만 리렌더되게 했다.
 * @param props.rows - 계산된 계열
 * @param props.scales - 좌표 변환
 * @param props.layout - 플롯 영역
 * @param props.slots - 코드별 색 슬롯
 * @param props.names - 코드별 표시명
 * @param props.weeks - 전체 주차 라벨
 * @param props.startIndex - 표시 구간 시작 인덱스
 * @param props.amount - 투자 원금
 */
function ChartBody({
  rows,
  scales,
  layout,
  slots,
  names,
  weeks,
  startIndex,
  amount,
}: ChartBodyProps) {
  const { x0, x1, y0, y1, narrow } = layout;
  const ticks = buildTicks(scales.lo, scales.hi, 4);
  const xLabels = buildXLabels(weeks, startIndex, scales, layout);
  const endLabels = placeEndLabels(rows, scales, slots, layout);
  const baseY = scales.sy(amount);

  return (
    <g>
      {/* 가로 그리드 + Y축 라벨 */}
      {ticks.map((v) => {
        const y = scales.sy(v);
        if (y < y0 - 1 || y > y1 + 1) return null;
        return (
          <g key={v}>
            <line
              x1={x0}
              x2={x1}
              y1={y}
              y2={y}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={x0 - 9}
              y={y + 4}
              textAnchor="end"
              fill="var(--ink-muted)"
              fontSize={narrow ? 10 : 11}
              fontFamily="var(--font-mono)"
            >
              {won(v)}
            </text>
          </g>
        );
      })}

      {/* 원금 기준선 — 손실 구간이 한눈에 보이게 */}
      <line
        x1={x0}
        x2={x1}
        y1={baseY}
        y2={baseY}
        stroke="var(--axis)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {!narrow && (
        <text x={x0 + 6} y={baseY - 6} fill="var(--ink-muted)" fontSize={10.5}>
          원금 {won(amount)}
        </text>
      )}

      {/* X축 */}
      {xLabels.map((l) => (
        <text
          key={l.i}
          x={l.x}
          y={y1 + 18}
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize={narrow ? 10 : 11}
          fontFamily="var(--font-mono)"
        >
          {l.text}
        </text>
      ))}
      <line
        x1={x0}
        x2={x1}
        y1={y1}
        y2={y1}
        stroke="var(--axis)"
        strokeWidth={1}
      />

      {/* 계열 */}
      {rows.map((r) => (
        <path
          key={r.code}
          d={buildLinePath(r.values, scales)}
          fill="none"
          stroke={slotColor(slots[r.code] ?? 0)}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* 끝점 직접 라벨 — 라이트 모드에서 계열색 대비가 낮아 색에만 의존하지 않게 하는 보완 */}
      {endLabels.map((l) => (
        <g key={l.code}>
          <circle cx={l.x} cy={l.anchorY} r={3} fill={slotColor(l.slot)} />
          <text
            x={l.x + 12}
            y={l.labelY - 2}
            fill="var(--ink-2)"
            fontSize={11.5}
          >
            {(names[l.code] ?? l.code).length > 12
              ? `${(names[l.code] ?? l.code).slice(0, 11)}…`
              : (names[l.code] ?? l.code)}
          </text>
          <text
            x={l.x + 12}
            y={l.labelY + 11}
            fill={slotColor(l.slot)}
            fontSize={12}
            fontWeight={600}
            fontFamily="var(--font-mono)"
          >
            {won(l.final)}
          </text>
        </g>
      ))}
    </g>
  );
}

export default memo(ChartBody);
