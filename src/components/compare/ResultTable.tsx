import { slotColor } from "@/lib/chart/palette";
import { pct, pp, wonFull } from "@/lib/format";
import type { ComputedRow } from "@/lib/market/compute";
import { cn } from "@/lib/utils";

interface ResultTableProps {
  rows: ComputedRow[];
  slots: Record<string, number>;
  names: Record<string, string>;
  amount: number;
  /** 미국 종목이 하나라도 있으면 환율 열을 보여준다 */
  showFx: boolean;
}

const signClass = (v: number) =>
  v > 0 ? "text-good" : v < 0 ? "text-critical" : "text-ink-2";

/**
 * @description 비교 결과 표 — 차트의 접근 가능한 대체물이기도 하다.
 *
 * 환율 기여분을 별도 열로 둔다. 총수익률 = 주가수익률 × 환율수익률로 분해하면
 * "엔비디아 +1,240% 중 환율이 +26%p 기여" 같은 정보가 나오는데,
 * 원화 투자자에게만 의미 있는 값이라 이 서비스의 차별점이 된다.
 * @param props.rows - 계산된 계열
 * @param props.slots - 코드별 색 슬롯
 * @param props.names - 코드별 표시명
 * @param props.amount - 투자 원금
 * @param props.showFx - 환율 열 표시 여부
 */
export default function ResultTable({
  rows,
  slots,
  names,
  amount,
  showFx,
}: ResultTableProps) {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => b.final - a.final);

  return (
    <div className="border-hairline overflow-x-auto border">
      <table className="w-full border-collapse text-[13px]">
        <caption className="sr-only">
          투자금 {wonFull(amount)} 기준 비교 결과
        </caption>
        <thead>
          <tr className="border-hairline bg-surface border-b">
            <th scope="col" className="px-3 py-2.5 text-left font-medium">
              종목
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              최종 평가액
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              총수익률
            </th>
            {showFx && (
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                주가 / 환율
              </th>
            )}
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              연평균
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              최대 낙폭
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.code} className="border-hairline border-b last:border-0">
              <th scope="row" className="px-3 py-2.5 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ background: slotColor(slots[r.code] ?? 0) }}
                  />
                  <span className="truncate">{names[r.code] ?? r.code}</span>
                </span>
              </th>
              <td className="tnum px-3 py-2.5 text-right font-semibold">
                {wonFull(r.final)}
              </td>
              <td
                className={cn(
                  "tnum px-3 py-2.5 text-right",
                  signClass(r.total)
                )}
              >
                {pct(r.total)}
              </td>
              {showFx && (
                <td className="tnum text-ink-muted px-3 py-2.5 text-right text-[12px]">
                  {r.fxReturn === null ? (
                    "—"
                  ) : (
                    <>
                      {pct(r.priceReturn)}
                      <span className="mx-1 opacity-50">/</span>
                      <span className={signClass(r.fxReturn)}>
                        {pp(r.fxReturn)}
                      </span>
                    </>
                  )}
                </td>
              )}
              <td
                className={cn("tnum px-3 py-2.5 text-right", signClass(r.cagr))}
              >
                {pct(r.cagr)}
              </td>
              <td className="tnum text-critical px-3 py-2.5 text-right">
                {pct(r.mdd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
