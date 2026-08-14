/**
 * 계열색 배정 — 같은 종목 조합이면 언제나 같은 색.
 *
 * 계산(compute)에서 색을 떼어낸 이유: OG 이미지 생성기(satori)는 CSS 변수를 해석하지 못한다.
 * 여기서는 슬롯 번호만 정하고, React는 CSS 변수를, OG는 리터럴 hex를 각각 꺼내 쓴다.
 */

export const MAX_PICKS = 5;

/** globals.css의 --chart-1..5와 1:1 대응. hex는 라이트 모드 값(OG 이미지용) */
export const SERIES_TOKENS = [
  { cssVar: "var(--chart-1)", hex: "#2a78d6" },
  { cssVar: "var(--chart-2)", hex: "#eb6834" },
  { cssVar: "var(--chart-3)", hex: "#1baf7a" },
  { cssVar: "var(--chart-4)", hex: "#eda100" },
  { cssVar: "var(--chart-5)", hex: "#e87ba4" },
] as const;

/** 문자열 해시 — 종목이 선호하는 슬롯을 결정론적으로 뽑는다 */
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/**
 * @description 종목 코드들에 색 슬롯(0~4)을 배정한다.
 *
 * 각 종목이 해시로 선호 슬롯을 갖고, 충돌하면 다음 빈 슬롯으로 밀린다.
 * 탐사 순서를 **정렬된 코드 기준**으로 두는 게 핵심이다 — 사용자가 고른 순서대로 탐사하면
 * `A-vs-B`와 `B-vs-A`의 색이 달라져 "같은 조합이면 같은 화면"이 깨진다.
 * @param codes - 선택된 종목 코드
 * @returns code → 슬롯 번호
 */
export const assignSlots = (codes: string[]): Record<string, number> => {
  const taken: (string | null)[] = new Array(MAX_PICKS).fill(null);
  const map: Record<string, number> = {};

  for (const code of [...codes].sort()) {
    const pref = hash(code) % MAX_PICKS;
    let slot = pref;
    for (let k = 0; k < MAX_PICKS; k++) {
      const cand = (pref + k) % MAX_PICKS;
      if (taken[cand] === null) {
        slot = cand;
        break;
      }
    }
    taken[slot] = code;
    map[code] = slot;
  }
  return map;
};

/** @description 슬롯 번호 → CSS 변수 (화면용) */
export const slotColor = (slot: number): string =>
  SERIES_TOKENS[slot % MAX_PICKS].cssVar;

/** @description 슬롯 번호 → 리터럴 hex (OG 이미지용 — satori는 CSS 변수를 못 읽는다) */
export const slotHex = (slot: number): string =>
  SERIES_TOKENS[slot % MAX_PICKS].hex;
