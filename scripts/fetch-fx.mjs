/**
 * 환율 수집 — 증분. data/cache/fx-daily.ndjson 에 일별 원본을 쌓는다.
 *
 *   node scripts/fetch-fx.mjs
 *
 * 소스 우선순위: ECOS(키 있을 때) → 네이버(키 불필요). 사용한 소스를 산출물에 기록해
 * 화면 각주 문구가 따라 바뀌게 한다 — 출처를 숨기지 않는 것이 이 프로젝트의 원칙이다.
 *
 * 일별 원본을 캐시에 두고 주차 집계는 fetch.mjs가 한다. 환율 소스를 바꾸거나
 * 주차 정의를 고쳐도 원본을 다시 받을 필요가 없다.
 */

import { readNdjson, writeNdjsonIfChanged } from "./lib/io.mjs";
import * as ecos from "./sources/ecos-fx.mjs";
import * as naver from "./sources/naver-fx.mjs";

const CACHE = new URL("../data/cache/fx-daily.ndjson", import.meta.url);
const FROM = "20000101";

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

const main = async () => {
  const cached = await readNdjson(CACHE);
  const byDate = new Map(cached.map((r) => [r.date, r]));
  const latest = cached.length ? cached[cached.length - 1].date : null;
  const apiKey = process.env.ECOS_API_KEY;

  console.log(`환율 수집 — 캐시 ${cached.length}건${latest ? ` (최신 ${latest})` : " (비어 있음)"}`);

  let fetched = [];
  let source = naver.SOURCE_ID;

  if (apiKey) {
    // ECOS는 범위 조회라 증분 구간만 요청하면 된다
    try {
      fetched = await ecos.fetchDailyFx({ from: latest ?? FROM, to: todayYmd(), apiKey });
      source = ecos.SOURCE_ID;
      console.log(`  ECOS ${fetched.length}건 수신`);
    } catch (err) {
      console.warn(`  ECOS 실패(${err.message}) — 네이버로 폴백`);
    }
  }

  if (source === naver.SOURCE_ID) {
    // 네이버는 최신순 페이지를 거슬러 올라가므로 캐시 최신일에 닿으면 멈춘다
    fetched = await naver.fetchDailyFx({ from: FROM, stopAt: latest ?? undefined });
    console.log(`  네이버 ${fetched.length}건 수신${apiKey ? "" : " (ECOS_API_KEY 없음 — 2007년 이후만 수집)"}`);
  }

  for (const r of fetched) byDate.set(r.date, { date: r.date, rate: r.rate, src: source });

  const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const changed = await writeNdjsonIfChanged(CACHE, merged);

  if (!merged.length) throw new Error("환율 데이터가 하나도 없습니다");

  console.log(
    `\n완료 — ${merged.length}건 (${merged[0].date} ~ ${merged[merged.length - 1].date}), ` +
      `${changed ? "캐시 갱신" : "변경 없음"}`
  );
};

main().catch((err) => {
  console.error(`\n실패: ${err.message}`);
  process.exit(1);
});
