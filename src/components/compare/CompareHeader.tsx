"use client";

import type { ComputedRow, ResolvedRange } from "@/lib/market/compute";
import { COMPARE_SUBHEADING, HOME_HEADING, HOME_SUBHEADING } from "@/lib/site";
import type { Ticker } from "@/types/market";

import HeadlineSummary from "./HeadlineSummary";

interface CompareHeaderProps {
  picks: Ticker[];
  rows: ComputedRow[];
  range: ResolvedRange;
  names: Record<string, string>;
  weeks: string[];
  amount: number;
}

/**
 * @description 제목·부제·요약문 — 선택된 종목을 따라간다.
 *
 * 서버 컴포넌트로 두면 클라이언트에서 종목을 바꿔도 갱신되지 않아, URL은 `/테슬라`인데
 * 제목은 직전 조합을 계속 보여준다. 클라이언트로 내려도 SSR 출력이 정적 HTML에 그대로
 * 실리므로 크롤러가 읽는 h1은 달라지지 않는다 — 번들에 더해지는 건 이 JSX뿐이고
 * format 유틸은 차트 툴팁·결과표가 이미 쓰고 있다.
 *
 * 빈 상태에서는 홈 문구로 돌아간다. 종목을 다 지우면 URL도 `/`가 되므로 화면과 주소가 맞는다.
 * @param props.picks - 선택된 종목 (제목 조합)
 * @param props.rows - 계산된 계열
 * @param props.range - 비교 구간
 * @param props.names - 코드별 표시명
 * @param props.weeks - 주차 라벨
 * @param props.amount - 투자 원금
 */
export default function CompareHeader({
  picks,
  rows,
  range,
  names,
  weeks,
  amount,
}: CompareHeaderProps) {
  const filled = picks.length > 0;

  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">
        {filled ? picks.map((t) => t.name).join(" vs ") : HOME_HEADING}
      </h1>
      <p className="text-ink-2 mt-1 text-[13px]">
        {filled ? COMPARE_SUBHEADING : HOME_SUBHEADING}
      </p>

      {/* rows가 비면 요약문이 null이므로 여백까지 함께 걷어낸다 */}
      {rows.length > 0 && (
        <div className="mt-5">
          <HeadlineSummary
            rows={rows}
            range={range}
            names={names}
            weeks={weeks}
            amount={amount}
          />
        </div>
      )}
    </header>
  );
}
