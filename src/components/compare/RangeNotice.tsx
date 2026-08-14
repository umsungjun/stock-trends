import { ymd } from "@/lib/format";
import type { ResolvedRange } from "@/lib/market/compute";

interface RangeNoticeProps {
  range: ResolvedRange;
  names: Record<string, string>;
  weeks: string[];
}

/**
 * @description 비교 구간이 요청보다 좁아졌을 때의 안내.
 *
 * 토스트가 아니라 인라인 고정 영역이다. 3초 뒤 사라지면 나중에 화면을 본 사람이
 * "왜 10년을 눌렀는데 6년만 나오지"를 알 방법이 없어진다 — 화면이 그 상태인 동안
 * 계속 보여야 하는 정보다.
 * @param props.range - resolveRange 결과
 * @param props.names - 코드별 표시명
 * @param props.weeks - 전체 주차 라벨
 */
export default function RangeNotice({ range, names, weeks }: RangeNoticeProps) {
  if (!range.clamped) return null;

  const from = weeks[range.start];
  const to = weeks[range.end];
  const who = range.byCode ? (names[range.byCode] ?? range.byCode) : null;

  return (
    <p className="border-hairline bg-surface text-ink-2 border px-3 py-2 text-[12.5px]">
      {range.reason === "fx" ? (
        <>
          미국 종목은 환율 데이터가 있는 구간만 원화로 환산할 수 있어, 비교
          구간을{" "}
          <b className="font-semibold">
            {ymd(from)} ~ {ymd(to)}
          </b>
          로 맞췄습니다.
        </>
      ) : (
        <>
          <b className="font-semibold">{who}</b> 상장이 {ymd(from)}이라, 실제
          비교 구간을{" "}
          <b className="font-semibold">
            {ymd(from)} ~ {ymd(to)}
          </b>
          로 맞췄습니다.
        </>
      )}
    </p>
  );
}
