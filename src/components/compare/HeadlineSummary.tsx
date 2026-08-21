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
 * @description 비교 결과를 한국어 문장으로 요약한다.
 *
 * 검색 결과에서 순위와 클릭을 만드는 건 SVG path가 아니라 이 문장의 숫자다.
 * CompareHeader를 통해 클라이언트 트리에 있지만 SSR 출력이 초기 HTML에 그대로 실려
 * 크롤러가 읽는 내용은 같다. 대신 기간·투자금을 바꾸면 문장도 따라 갱신된다.
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
