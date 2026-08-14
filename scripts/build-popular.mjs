/**
 * 사전 생성 슬러그 목록 → public/data/popular-slugs.json
 *
 *   node scripts/build-popular.mjs
 *
 * 2,147종목의 2개 조합은 230만 개라 전수 생성은 불가능하다. 온디맨드 생성 + 무기한 캐시가
 * 있으므로 사전 생성의 목적은 속도가 아니라 **sitemap에 올릴 URL을 확정하는 것**이다.
 *
 * generateStaticParams와 sitemap.ts가 이 파일을 함께 읽는다 — 사전 생성 목록과 sitemap이
 * 어긋나는 사고를 구조적으로 막기 위함이다.
 */
import { readJsonIfExists, writeJsonIfChanged } from "./lib/io.mjs";

const UNIVERSE = new URL("../data/universe.json", import.meta.url);
const OUT = new URL("../public/data/popular-slugs.json", import.meta.url);

/** "X vs 벤치마크"가 실제로 가장 많이 검색되는 형태다 */
const BENCHMARKS = [
  "069500", // KODEX 200
  "360750", // TIGER 미국S&P500
  "005930", // 삼성전자
  "SPY",
  "QQQ",
  "AAPL",
  "NVDA",
  "VOO",
];

/** 클릭률이 가장 높은 구간 — 사람이 고른다 */
const RIVALRIES = [
  ["005930", "000660"], // 삼성전자 vs SK하이닉스
  ["035420", "035720"], // NAVER vs 카카오
  ["005380", "000270"], // 현대차 vs 기아
  ["373220", "006400"], // LG에너지솔루션 vs 삼성SDI
  ["207940", "068270"], // 삼성바이오로직스 vs 셀트리온
  ["005930", "AAPL"],
  ["005930", "NVDA"],
  ["069500", "360750"], // 코스피 vs S&P500
  ["AAPL", "NVDA"],
  ["AAPL", "MSFT"],
  ["NVDA", "TSLA"],
  ["MSFT", "GOOGL"],
  ["AMZN", "GOOGL"],
  ["META", "GOOGL"],
  ["SPY", "QQQ"],
  ["VOO", "QQQ"],
  ["SCHD", "JEPI"],
  ["QQQ", "TQQQ"],
  ["GLD", "SPY"],
  ["SOXX", "SMH"],
];

/** 섹터별 상위 N개끼리의 조합 */
const SECTOR_TOP = 5;

const pairKey = (a, b) => [a, b].sort().join("|");

const main = async () => {
  const universe = await readJsonIfExists(UNIVERSE);
  if (!universe?.tickers?.length) throw new Error("data/universe.json 없음");

  const active = universe.tickers.filter((t) => t.active !== false);
  const slugOf = new Map(active.map((t) => [t.code, t.slug]));
  const rankOf = new Map(active.map((t) => [t.code, t.rank ?? 9999]));

  const slugs = new Set();
  const pairs = new Set();

  const addPair = (a, b) => {
    if (a === b) return;
    const sa = slugOf.get(a);
    const sb = slugOf.get(b);
    if (!sa || !sb) return;
    const key = pairKey(a, b);
    if (pairs.has(key)) return;
    pairs.add(key);
    // 순서는 시총 상위가 앞 — canonical이 흔들리지 않게 결정론적으로 고정한다
    const [first, second] =
      (rankOf.get(a) ?? 9999) <= (rankOf.get(b) ?? 9999) ? [a, b] : [b, a];
    slugs.add(`${slugOf.get(first)}-vs-${slugOf.get(second)}`);
  };

  // T1 — 전 종목 단일. "삼성전자 10년 수익률" 류 검색어와 1:1로 대응하는 롱테일 본진
  for (const t of active) slugs.add(t.slug);
  const t1 = slugs.size;

  // T2 — 시총 상위 × 벤치마크
  const topByMarket = (market, n) =>
    active
      .filter((t) => t.market === market && t.kind === "주식")
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
      .slice(0, n);

  for (const t of [...topByMarket("KR", 150), ...topByMarket("US", 150)]) {
    for (const b of BENCHMARKS) addPair(t.code, b);
  }
  const t2 = slugs.size - t1;

  // T3 — 수기 라이벌
  for (const [a, b] of RIVALRIES) addPair(a, b);
  const t3 = slugs.size - t1 - t2;

  // T4 — GICS 섹터별 상위 종목끼리 (S&P 500 csv의 섹터 정보 활용)
  const bySector = new Map();
  for (const t of active) {
    if (!t.sector) continue;
    if (!bySector.has(t.sector)) bySector.set(t.sector, []);
    bySector.get(t.sector).push(t);
  }
  for (const list of bySector.values()) {
    const top = list
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
      .slice(0, SECTOR_TOP);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++)
        addPair(top[i].code, top[j].code);
    }
  }
  const t4 = slugs.size - t1 - t2 - t3;

  const list = [...slugs].sort();
  const changed = await writeJsonIfChanged(OUT, list);

  console.log("사전 생성 슬러그");
  console.log(`  T1 단일 종목          ${String(t1).padStart(6)}`);
  console.log(`  T2 상위 × 벤치마크     ${String(t2).padStart(6)}`);
  console.log(`  T3 수기 라이벌         ${String(t3).padStart(6)}`);
  console.log(`  T4 섹터별 조합         ${String(t4).padStart(6)}`);
  console.log(`  합계                  ${String(list.length).padStart(6)}`);
  console.log(
    `\n${changed ? "갱신" : "변경 없음"} → public/data/popular-slugs.json`
  );
};

main().catch((err) => {
  console.error(`\n실패: ${err.message}`);
  process.exit(1);
});
