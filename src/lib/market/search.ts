/**
 * 종목 검색 — 초성·이름·코드·영문명.
 *
 * 진입 마찰이 검색창 하나에 걸려 있다. "삼성전자"를 다 치게 하지 않고 `ㅅㅅㅈㅈ`로 찾게 한다.
 */
import type { Ticker } from "@/types/market";

const CHO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JAMO_PER_CHO = 588; // 중성 21 × 종성 28

/**
 * @description 한글 문자열을 초성으로 바꾼다. 한글이 아닌 문자는 그대로 둔다.
 * @param s - 원본 문자열
 * @returns 소문자화된 초성 문자열 ("삼성전자" → "ㅅㅅㅈㅈ")
 */
export const choseong = (s: string): string => {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    out +=
      c >= HANGUL_START && c <= HANGUL_END
        ? CHO[Math.floor((c - HANGUL_START) / JAMO_PER_CHO)]
        : ch;
  }
  return out.toLowerCase();
};

/** 검색 정렬 우선순위 — 낮을수록 위. 우선주·리츠는 노이즈라 뒤로 민다 */
const kindRank = (kind: Ticker["kind"]): number =>
  kind === "주식" ? 0 : kind === "ETF" ? 1 : 2;

/**
 * @description 질의에 맞는 종목을 점수순으로 돌려준다.
 *
 * 접두 일치를 부분 일치보다 앞에 둔다 — "삼성"을 쳤을 때 "삼성전자"가
 * "한국삼성전자우선주" 같은 것보다 먼저 나와야 한다.
 * @param tickers - 전체 목록
 * @param query - 사용자 입력
 * @param limit - 최대 결과 수
 * @returns 점수 정렬된 종목
 */
export const matchTickers = (
  tickers: Ticker[],
  query: string,
  limit = 8
): Ticker[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { t: Ticker; score: number }[] = [];

  for (const t of tickers) {
    const name = t.name.toLowerCase();
    const eng = t.englishName?.toLowerCase() ?? "";
    let score = -1;

    if (name === q || t.code.toLowerCase() === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (t.code.toLowerCase().startsWith(q)) score = 2;
    else if (eng.startsWith(q)) score = 3;
    else if (t.choseong.startsWith(q)) score = 4;
    else if (name.includes(q)) score = 5;
    else if (eng.includes(q)) score = 6;
    else if (t.choseong.includes(q)) score = 7;

    if (score >= 0) scored.push({ t, score });
  }

  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        kindRank(a.t.kind) - kindRank(b.t.kind) ||
        a.t.name.length - b.t.name.length ||
        a.t.name.localeCompare(b.t.name)
    )
    .slice(0, limit)
    .map((s) => s.t);
};
