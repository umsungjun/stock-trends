/**
 * 유니버스 생성 — data/universe.json.
 *
 *   node scripts/universe/build.mjs
 *
 * 시세 수집(fetch.mjs)과 주기를 분리한다. 시총 순위는 매주 바뀌는데 유니버스가 따라 흔들리면
 * 경계 종목이 매주 들락날락하고 **이미 공유된 URL이 깨진다.** 이 스크립트는 월 1회 PR로만 돈다.
 *
 * 한 번 발행한 종목은 삭제하지 않는다. 순위에서 밀리면 active:false로만 표시해
 * 검색에서는 숨기되 직링크와 파일은 살려둔다.
 */

import { readJsonIfExists, writeJsonIfChanged } from "../lib/io.mjs";
import {
  fetchKrEtfListing,
  fetchKrListing,
  fetchSp500,
  fetchUsListing,
} from "../sources/naver-listing.mjs";
import { normalizeSymbol } from "../sources/naver-foreign.mjs";
import { resolveSymbols } from "./resolve.mjs";
import { assignSlugs, buildAliases, classifyKr } from "./rules.mjs";
import { US_ETF_SEED } from "./seed-us-etf.mjs";

const OUT = new URL("../../data/universe.json", import.meta.url);
const ALIAS_FILE = new URL("../../data/us-etf-aliases.json", import.meta.url);

const TARGETS = { krStock: 1200, krEtf: 300, usStock: 550, usEtf: 100 };
/** 매칭 풀 — S&P 500 하위 종목까지 닿으려면 시총 순위를 넉넉히 받아야 한다 */
const US_POOL = { NASDAQ: 1200, NYSE: 1200, AMEX: 400 };

/** 미국 심볼 → 파일명·URL에 쓸 앱 코드. 점은 URL에서 확장자로 오인되므로 하이픈으로 */
const toAppCode = (symbol) => symbol.replace(/\./g, "-");

const buildKr = async () => {
  const [kospi, kosdaq, etfs] = await Promise.all([
    fetchKrListing("KOSPI", 1500),
    fetchKrListing("KOSDAQ", 1500),
    fetchKrEtfListing(TARGETS.krEtf),
  ]);

  const etfCodes = new Set(etfs.map((e) => e.code));
  const stocks = [];

  for (const s of [...kospi, ...kosdaq].sort((a, b) => b.marketValue - a.marketValue)) {
    if (etfCodes.has(s.code)) continue; // 국내 목록엔 ETF가 섞여 나온다
    const kind = classifyKr(s);
    if (!kind) continue; // 스팩 제외
    stocks.push({ code: s.code, name: s.name, kind, market: "KR", src: s.code, exchange: s.market, rank: stocks.length + 1 });
    if (stocks.length >= TARGETS.krStock) break;
  }

  const etfEntries = etfs.map((e, i) => ({
    code: e.code, name: e.name, kind: "ETF", market: "KR", src: e.code, exchange: "KRX", rank: i + 1,
  }));

  return [...stocks, ...etfEntries];
};

const buildUs = async (aliasMap) => {
  const [sp500, ...pools] = await Promise.all([
    fetchSp500(),
    fetchUsListing("NASDAQ", US_POOL.NASDAQ),
    fetchUsListing("NYSE", US_POOL.NYSE),
    fetchUsListing("AMEX", US_POOL.AMEX),
  ]);
  const pool = pools.flat();

  // 심볼 → 네이버 확정 정보. 점 든 티커(BRK.B)는 정규화 형태로도 찾을 수 있게 둘 다 색인한다
  const bySymbol = new Map();
  for (const p of pool) {
    bySymbol.set(p.symbol.toUpperCase(), p);
    bySymbol.set(normalizeSymbol(p.symbol).toUpperCase(), p);
    bySymbol.set(p.reutersCode.toUpperCase(), p);
  }
  const lookup = (sym) =>
    bySymbol.get(sym.toUpperCase()) ?? bySymbol.get(normalizeSymbol(sym).toUpperCase()) ?? null;

  const picked = new Map();
  const missingSp = [];

  // ① S&P 500 전 종목이 최우선 — 명시적 요구 조건
  for (const s of sp500) {
    const hit = lookup(s.symbol);
    if (!hit) { missingSp.push(s.symbol); continue; }
    picked.set(hit.reutersCode, {
      code: toAppCode(hit.symbol), name: hit.name, nameEng: hit.nameEng, kind: "주식",
      market: "US", src: hit.reutersCode, exchange: hit.exchange, sector: s.sector,
      symbol: hit.symbol, marketValue: hit.marketValue,
    });
  }

  // ② 남은 자리를 시총순으로 채운다
  for (const p of pool.sort((a, b) => b.marketValue - a.marketValue)) {
    if (picked.size >= TARGETS.usStock) break;
    if (picked.has(p.reutersCode)) continue;
    picked.set(p.reutersCode, {
      code: toAppCode(p.symbol), name: p.name, nameEng: p.nameEng, kind: "주식",
      market: "US", src: p.reutersCode, exchange: p.exchange, symbol: p.symbol,
      marketValue: p.marketValue,
    });
  }

  // ③ ETF 시드 — 거래소 목록에 ETF가 없어서 접미사 순회로 해석한다 (결과는 캐시됨)
  const seed = US_ETF_SEED.slice(0, TARGETS.usEtf);
  const { resolved, failed, probes } = await resolveSymbols(seed);
  const etfEntries = seed
    .filter((e) => resolved.has(e.symbol))
    .map((e) => {
      const hit = resolved.get(e.symbol);
      const alias = aliasMap[e.symbol];
      return {
        code: toAppCode(e.symbol), name: alias?.display ?? e.name, nameEng: hit.name,
        kind: "ETF", market: "US", src: hit.reutersCode, exchange: e.exchange,
        symbol: e.symbol, tossName: alias?.toss ?? null,
      };
    });

  // 미국 개별주는 시총순으로 rank를 매긴다 (S&P 우선 삽입 순서와 무관하게)
  const usStocks = [...picked.values()].sort(
    (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)
  );
  usStocks.forEach((e, i) => { e.rank = i + 1; delete e.marketValue; });
  etfEntries.forEach((e, i) => { e.rank = i + 1; });

  return {
    entries: [...usStocks, ...etfEntries],
    missingSp, etfFailed: failed, probes, sp500Count: sp500.length,
  };
};

const main = async () => {
  const started = Date.now();
  const prev = await readJsonIfExists(OUT, { tickers: [] });
  const aliasMap = (await readJsonIfExists(ALIAS_FILE, {})) ?? {};

  console.log("유니버스 생성 시작\n");

  const [kr, us] = await Promise.all([buildKr(), buildUs(aliasMap)]);
  const fresh = [...kr, ...us.entries];

  // 슬러그·별칭은 전체 집합 기준으로 한 번에 확정한다 (충돌 해소가 전역이어야 하므로)
  const slugByCode = assignSlugs(fresh);
  const aliases = buildAliases(fresh, slugByCode);

  const byCode = new Map(fresh.map((e) => [e.code, { ...e, slug: slugByCode.get(e.code), active: true }]));

  // 이전 유니버스에만 있던 종목은 비활성으로 살려둔다 — 공유된 URL을 죽이지 않기 위함
  let deactivated = 0;
  for (const old of prev.tickers ?? []) {
    if (byCode.has(old.code)) continue;
    byCode.set(old.code, { ...old, active: false });
    deactivated++;
  }

  const tickers = [...byCode.values()].sort((a, b) =>
    a.market === b.market ? a.code.localeCompare(b.code) : a.market.localeCompare(b.market)
  );

  const counts = tickers.reduce((acc, t) => {
    if (t.active === false) { acc.비활성++; return acc; }
    acc[`${t.market} ${t.kind}`] = (acc[`${t.market} ${t.kind}`] ?? 0) + 1;
    return acc;
  }, { 비활성: 0 });

  await writeJsonIfChanged(OUT, { generatedAt: new Date().toISOString(), counts, aliases, tickers }, { pretty: true });

  console.log("구성:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}`);
  console.log(`  ${"합계".padEnd(12)} ${String(tickers.filter((t) => t.active !== false).length).padStart(5)}`);
  console.log(`\n별칭 ${Object.keys(aliases).length}개`);
  console.log(`S&P 500 ${us.sp500Count}종목 중 미매칭 ${us.missingSp.length}개${us.missingSp.length ? `: ${us.missingSp.join(", ")}` : ""}`);
  console.log(`ETF 심볼 해석 — probe ${us.probes}회, 실패 ${us.etfFailed.length}개${us.etfFailed.length ? `: ${us.etfFailed.join(", ")}` : ""}`);
  if (deactivated) console.log(`이전 유니버스에서 비활성 처리: ${deactivated}개`);
  console.log(`\n완료 — ${((Date.now() - started) / 1000).toFixed(1)}초 → data/universe.json`);
};

main().catch((err) => {
  console.error(`\n실패: ${err.message}`);
  process.exit(1);
});
