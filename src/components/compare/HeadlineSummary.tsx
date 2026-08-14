import { pct, won, ymd } from "@/lib/format";
import type { ComputedRow, ResolvedRange } from "@/lib/market/compute";

interface HeadlineSummaryProps {
  rows: ComputedRow[];
  range: ResolvedRange;
  names: Record<string, string>;
  weeks: string[];
  amount: number;
}

/**
 * @description 비교 결과를 한국어 문장으로 요약하는 서버 컴포넌트.
 *
 * 검색 결과에서 순위와 클릭을 만드는 건 SVG path가 아니라 이 문장의 숫자다.
 * 서버 컴포넌트라 JS 번들에 들어가지 않으면서 초기 HTML에는 그대로 실린다.
 * @param props.rows - 계산된 계열
 * @param props.range - 비교 구간
 * @param props.names - 코드별 표시명
 * @param props.weeks - 주차 라벨
 * @param props.amount - 투자 원금
 */
export default function HeadlineSummary({
  rows,
  range,
  names,
  weeks,
  amount,
}: HeadlineSummaryProps) {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => b.final - a.final);
  const from = weeks[range.start];
  const to = weeks[range.end];

  return (
    <p className="text-ink-2 text-[13.5px] leading-relaxed">
      <b className="text-ink font-semibold">{ymd(from)}</b>에 {won(amount)}원을
      넣었다면 {ymd(to)} 기준으로{" "}
      {sorted.map((r, i) => (
        <span key={r.code}>
          {i > 0 && (i === sorted.length - 1 ? ", " : ", ")}
          <b className="text-ink font-semibold">
            {names[r.code] ?? r.code}
          </b>{" "}
          {won(r.final)}원
          <span className="text-ink-muted">
            {" "}
            (연 {pct(r.cagr)}, 최대 낙폭 {pct(r.mdd)})
          </span>
        </span>
      ))}
      가 됐습니다.
    </p>
  );
}
