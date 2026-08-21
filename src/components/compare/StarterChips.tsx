"use client";

import type { Ticker } from "@/types/market";

import { Plus } from "lucide-react";

interface StarterChipsProps {
  starters: Ticker[];
  onPick: (t: Ticker) => void;
}

/**
 * @description 빈 화면의 시작점 — 클릭하면 바로 차트에 담기는 추천 종목.
 *
 * 첫 화면이 기본 조합을 자동으로 채우지 않으므로(`/`가 빈 상태를 뜻해야 URL 왕복이 대칭이다)
 * 검색어를 떠올리지 못한 사람에게 진입로가 필요하다. 아래 "많이 비교하는 조합"과 역할이 다르다 —
 * 그쪽은 페이지 이동이라 크롤러 경로를 만들고, 이쪽은 지금 보고 있는 차트에 계열을 더한다.
 *
 * 시각 언어는 PickChips와 맞췄다. 담기 전과 담은 후가 같은 계열로 읽혀야 조작 결과가 예측된다.
 * @param props.starters - 추천 종목 메타 (서버가 코드로부터 해석해 넘긴다)
 * @param props.onPick - 종목 추가 콜백
 */
export default function StarterChips({
  starters,
  onPick,
}: StarterChipsProps) {
  if (!starters.length) return null;

  return (
    <div>
      <p className="text-ink-2 text-[13px]">이런 종목으로 시작해 보세요</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {starters.map((t) => (
          <li key={t.code}>
            <button
              type="button"
              onClick={() => onPick(t)}
              aria-label={`${t.name} 비교에 추가`}
              className="border-hairline bg-chip hover:bg-chip-hover flex cursor-pointer items-center gap-1.5 border py-1 pr-2.5 pl-1.5 text-[13px] transition-colors"
            >
              <Plus size={13} className="text-ink-muted shrink-0" />
              <span>{t.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
