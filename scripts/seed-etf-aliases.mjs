/**
 * 미국 ETF 한글명 시드 — 토스증권에서 1회만 받아 data/us-etf-aliases.json에 굽는다.
 *
 *   node scripts/seed-etf-aliases.mjs
 *
 * 네이버는 미국 ETF에 영문명만 준다 (QQQ.O → "Invesco QQQ Trust  Series 1").
 * 토스는 detailName에 한글명을 갖고 있다 (→ "인베스코 QQQ ETF").
 *
 * ⚠️ 런타임 의존으로 쓰지 않는다. 공개 문서가 없는 내부 API라 예고 없이 바뀐다.
 *    결과를 커밋한 뒤로는 이 스크립트를 다시 돌리지 않아도 서비스가 돈다.
 *
 * ⚠️ 토스 원문은 차트 범례에 쓰기엔 길다 ("SPDR S&P500 ETF 트러스트").
 *    seed-us-etf.mjs의 짧은 표시명을 우선하고, 토스 원문은 검색 별칭으로만 남긴다.
 */

import { fetchJson, pooled, postJson } from "./lib/http.mjs";
import { writeJsonIfChanged } from "./lib/io.mjs";
import { US_ETF_SEED } from "./universe/seed-us-etf.mjs";

const SEARCH = "https://wts-info-api.tossinvest.com/api/v3/search-all/wts-auto-complete";
const DETAIL = "https://wts-info-api.tossinvest.com/api/v2/stock-infos";
const OUT = new URL("../data/us-etf-aliases.json", import.meta.url);

const HEADERS = { Referer: "https://www.tossinvest.com/", Origin: "https://www.tossinvest.com" };

/** 티커로 검색해 토스 내부 productCode를 얻는다 (예: QQQ → US19990310001) */
const findProductCode = async (symbol) => {
  const d = await postJson(SEARCH, { query: symbol, sections: [{ type: "PRODUCT" }] }, { headers: HEADERS, retries: 2 });
  const items = d?.result?.[0]?.data?.items ?? [];
  // 검색은 유사 티커도 준다(QQQ → QQQM). 정확히 일치하는 것만 채택
  return items.find((i) => i.symbol === symbol)?.productCode ?? null;
};

const fetchDetailName = async (productCode) => {
  const d = await fetchJson(`${DETAIL}/${productCode}`, { headers: HEADERS, retries: 2 });
  return d?.result?.detailName ?? null;
};

const main = async () => {
  console.log(`미국 ETF 한글명 수집 — ${US_ETF_SEED.length}개 (토스증권)\n`);

  const rows = await pooled(US_ETF_SEED, 4, async (etf) => {
    try {
      const code = await findProductCode(etf.symbol);
      if (!code) return { ...etf, tossName: null, reason: "검색 결과 없음" };
      const tossName = await fetchDetailName(code);
      return { ...etf, tossName, reason: tossName ? null : "detailName 없음" };
    } catch (err) {
      return { ...etf, tossName: null, reason: err.message.slice(0, 40) };
    }
  });

  const found = rows.filter((r) => r.tossName);
  const missing = rows.filter((r) => !r.tossName);

  // display = 우리가 다듬은 짧은 이름(범례용), toss = 원문(검색 별칭용)
  const aliases = Object.fromEntries(
    rows.map((r) => [r.symbol, { display: r.name, toss: r.tossName ?? null }])
  );

  await writeJsonIfChanged(OUT, aliases, { pretty: true });

  console.log(`한글명 확보 ${found.length} / ${rows.length}`);
  for (const r of found.slice(0, 10)) console.log(`  ${r.symbol.padEnd(6)} ${r.name.padEnd(22)} ← ${r.tossName}`);
  if (found.length > 10) console.log(`  … 외 ${found.length - 10}개`);

  if (missing.length) {
    console.log(`\n미확보 ${missing.length}개 (seed-us-etf.mjs의 표시명을 그대로 씁니다):`);
    for (const r of missing) console.log(`  ${r.symbol.padEnd(6)} ${r.reason}`);
  }
  console.log(`\n→ data/us-etf-aliases.json`);
};

main().catch((err) => {
  console.error(`\n실패: ${err.message}`);
  process.exit(1);
});
