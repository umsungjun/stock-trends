"use client";

import { useMemo, useRef, useState } from "react";

import { useElementWidth } from "@/hooks/useElementWidth";
import {
  buildScales,
  chartLayout,
  indexFromPointer,
} from "@/lib/chart/geometry";
import type { ComputedRow } from "@/lib/market/compute";

import ChartBody from "./ChartBody";
import ChartCrosshair from "./ChartCrosshair";
import ChartTooltip from "./ChartTooltip";

interface ValueChartProps {
  rows: ComputedRow[];
  slots: Record<string, number>;
  names: Record<string, string>;
  weeks: string[];
  startIndex: number;
  amount: number;
}

/**
 * @description 평가액 비교 차트.
 *
 * 라이브러리를 쓰지 않는다. ResponsiveContainer류는 마운트 후 측정 방식이라 초기 HTML에
 * 차트가 안 들어가고 CLS가 생기는데, 롱테일 수천 페이지가 SEO 자산인 프로젝트에서 치명적이다.
 * 여기서는 서버가 기본 폭(900)으로 렌더한 SVG가 그대로 HTML에 실린다.
 *
 * 좌표 계산은 lib/chart/geometry.ts 순수 함수가 하고 이 컴포넌트는 JSX로 옮기기만 한다.
 * @param props.rows - 계산된 계열
 * @param props.slots - 코드별 색 슬롯
 * @param props.names - 코드별 표시명
 * @param props.weeks - 전체 주차 라벨
 * @param props.startIndex - 표시 구간 시작 인덱스
 * @param props.amount - 투자 원금
 */
export default function ValueChart({
  rows,
  slots,
  names,
  weeks,
  startIndex,
  amount,
}: ValueChartProps) {
  const { ref, width } = useElementWidth(900);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  // hover가 바뀌어도 재계산되지 않아야 ChartBody의 memo가 의미를 갖는다
  const layout = useMemo(() => chartLayout(width), [width]);
  const scales = useMemo(
    () => buildScales(rows, layout, amount),
    [rows, layout, amount]
  );

  if (!rows.length) {
    return (
      <div className="border-hairline text-ink-muted flex h-[280px] items-center justify-center border border-dashed text-[13px]">
        위에서 종목을 검색해 추가하면 여기에 비교 차트가 그려집니다.
      </div>
    );
  }

  const move = (next: number) => {
    setHover(Math.max(0, Math.min(scales.n - 1, next)));
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const cur = hover ?? scales.n - 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault(); // 없으면 페이지가 함께 스크롤된다
      setKeyboard(true);
      move(cur + (e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "Escape") {
      setHover(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        height={layout.height}
        tabIndex={0}
        role="img"
        aria-label="선택한 종목의 평가액 추이 비교 차트. 정확한 수치는 아래 비교 결과 표에 있습니다."
        className="touch-pan-y block outline-none"
        onPointerMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          setKeyboard(false);
          move(indexFromPointer(e.clientX, rect, scales, layout));
        }}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <ChartBody
          rows={rows}
          scales={scales}
          layout={layout}
          slots={slots}
          names={names}
          weeks={weeks}
          startIndex={startIndex}
          amount={amount}
        />
        <ChartCrosshair
          index={hover}
          rows={rows}
          scales={scales}
          layout={layout}
          slots={slots}
        />
      </svg>

      <ChartTooltip
        index={hover}
        rows={rows}
        scales={scales}
        layout={layout}
        slots={slots}
        names={names}
        weeks={weeks}
        startIndex={startIndex}
        live={keyboard}
      />
    </div>
  );
}
