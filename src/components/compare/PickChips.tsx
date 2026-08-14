"use client";

import { slotColor } from "@/lib/chart/palette";
import type { Ticker } from "@/types/market";

import { X } from "lucide-react";

interface PickChipsProps {
  picks: Ticker[];
  slots: Record<string, number>;
  onRemove: (code: string) => void;
}

/**
 * @description 선택된 종목 칩 — 차트의 범례를 겸한다.
 * 색 스와치가 차트 선과 1:1로 대응해 별도 범례가 필요 없다.
 * @param props.picks - 선택된 종목
 * @param props.slots - 코드별 색 슬롯
 * @param props.onRemove - 제거 콜백
 */
export default function PickChips({ picks, slots, onRemove }: PickChipsProps) {
  if (!picks.length) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="비교 중인 종목">
      {picks.map((t) => (
        <li
          key={t.code}
          className="border-hairline bg-chip flex items-center gap-2 border py-1 pr-1 pl-2 text-[13px]"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0"
            style={{ background: slotColor(slots[t.code] ?? 0) }}
          />
          <span className="max-w-[180px] truncate">{t.name}</span>
          <span className="text-ink-muted tnum text-[11px]">{t.code}</span>
          <button
            type="button"
            onClick={() => onRemove(t.code)}
            aria-label={`${t.name} 비교에서 제거`}
            className="text-ink-muted hover:bg-chip-hover hover:text-ink flex h-5 w-5 cursor-pointer items-center justify-center transition-colors"
          >
            <X size={13} />
          </button>
        </li>
      ))}
    </ul>
  );
}
