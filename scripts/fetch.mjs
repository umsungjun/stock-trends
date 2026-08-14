/**
 * 시세 수집 → 정적 JSON 생성. 빌드 타임에만 실행한다.
 *
 *   node scripts/fetch-fx.mjs && node scripts/fetch.mjs
 *
 * 조회 시점에 시세 API를 부르지 않기 위한 설계다. 주간 데이터라 한 달 내내 같은 배열을
 * 반복해 읽을 뿐이므로 DB가 할 일이 없다 — 정적 파일을 CDN에서 서빙하면 비용이 0에 수렴한다.
 *
 * 출력
 *   public/data/meta.json           주차 그리드 + 환율 (모든 페이지가 필요, 작게 유지)
 *   public/data/tickers.json        검색 목록 (검색창 첫 포커스 시 지연 로드)
 *   public/data/aliases.json        슬러그 별칭 → 코드 (서버가 URL 해석에만 사용)
 *   public/data/kr/{code}.json      원화 종가
 *   public/data/us/{code}.json      달러 종가 — 원화 환산은 클라이언트가 fx를 곱해서 한다
 *
 * 그리드는 ISO 주차다. 한국 바(금요일)와 미국 바(일요일)는 구조적으로 절대 같은 날이 아니라
 * 거래일 합집합을 쓰면 매주 두 칸이 생기고 모든 계열이 계단형으로 망가진다.
 */

import { pooled } from "./lib/http.mjs";
import { readJsonIfExists, readNdjson, writeJsonIfChanged } from "./lib/io.mjs";
import { sig } from "./lib/num.mjs";
import { isoWeekKey, latestPublishableWeek, weekKeyToFriday, weekRange } from "./lib/week.mjs";
import * as krSource from "./sources/naver-domestic.mjs";
import * as usSource from "./sources/naver-foreign.mjs";

const UNIVERSE = new URL("../data/universe.json", import.meta.url);
const FX_CACHE = new URL("../data/cache/fx-daily.ndjson", import.meta.url);
const OUT = new URL("../public/data/", import.meta.url);

const FROM = "20000101";
const CONCURRENCY = 6; // 상대 서버 배려 — 종목이 수천 개로 늘어도 이 값은 유지한다

/** 주차별 환율 — 그 주 마지막 영업일의 매매기준율을 채택하고, 없는 주는 직전 값으로 채운다 */
const buildFxByWeek = (daily, weeks) => {
  const lastOfWeek = new Map();
  for (const { date, rate } of daily) {
    const key = isoWeekKey(date);
    const prev = lastOfWeek.get(key);
    if (!prev || date > prev.date) lastOfWeek.set(key, { date, rate });
  }

  const values = [];
  let carry = null;
  let offset = -1;
  for (let i = 0; i < weeks.length; i++) {
    const hit = lastOfWeek.get(weeks[i]);
    if (hit) carry = hit.rate;
    if (carry === null) continue; // 환율이 시작되기 전 구간
    if (offset < 0) offset = i;
    values.push(sig(carry, 6));
  }
  return { o: offset < 0 ? 0 : offset, v: values };
};

/** 주차 키 배열 → 그리드 인덱스 기준 종가 배열. 상장 전은 잘라내고 중간 결측만 메운다 */
const toGridSeries = (weekKeys, closes, indexOf) => {
  const slots = new Map();
  for (let i = 0; i < weekKeys.length; i++) {
    const idx = indexOf.get(weekKeys[i]);
    if (idx !== undefined) slots.set(idx, closes[i]); // 같은 주차 중복은 뒤엣것이 이긴다
  }
  if (!slots.size) return null;

  const indices = [...slots.keys()].sort((a, b) => a - b);
  const first = indices[0];
  const last = indices[indices.length - 1];

  const values = [];
  let carry = null;
  for (let i = first; i <= last; i++) {
    const v = slots.get(i);
    if (v !== undefined) carry = v;
    // 거래정지·휴장으로 빈 주는 직전 값으로. 마지막 실관측에서 배열이 끝나므로
    // 상장폐지 종목이 영원히 평평한 선을 그리는 일은 없다
    values.push(sig(carry));
  }
  return { o: first, v: values };
};

const main = async () => {
  const started = Date.now();
  const universe = await readJsonIfExists(UNIVERSE);
  if (!universe?.tickers?.length) throw new Error("data/universe.json 없음 — universe/build.mjs 먼저 실행");

  const fxDaily = await readNdjson(FX_CACHE);
  if (!fxDaily.length) throw new Error("환율 캐시 없음 — fetch-fx.mjs 먼저 실행");

  const active = universe.tickers.filter((t) => t.active !== false);
  const lastWeek = latestPublishableWeek();

  // 이번 주차가 이미 발행돼 있으면 수집 자체를 건너뛴다 — 일요일 재시도가 전 종목을 다시 받는 것을 막는다.
  // 커밋된 meta.json을 보므로, 토요일이 verify에서 막혀 커밋되지 않았다면 여기 걸리지 않고 정상 재시도된다
  const published = await readJsonIfExists(new URL("meta.json", OUT));
  if (published?.asOfWeek === lastWeek && !process.env.FORCE_REFETCH) {
    console.log(`${lastWeek} 이미 발행됨 — 수집 생략 (강제 수집은 FORCE_REFETCH=1)`);
    return;
  }

  console.log(`시세 수집 — ${active.length}종목, 상한 ${lastWeek} (진행 중인 주차는 발행하지 않음)\n`);

  // ── 수집 ────────────────────────────────────────────────
  let done = 0;
  const results = await pooled(active, CONCURRENCY, async (t) => {
    const source = t.market === "US" ? usSource : krSource;
    try {
      const s = await source.fetchSeries(t.src, { from: FROM });
      // 진행 중인 주차를 잘라낸다 — 이게 없으면 매 실행마다 전 종목이 diff에 뜬다
      const cut = s.weekKeys.findIndex((k) => k > lastWeek);
      const end = cut < 0 ? s.weekKeys.length : cut;
      if (++done % 200 === 0) console.log(`  ${done}/${active.length} …`);
      return { t, weekKeys: s.weekKeys.slice(0, end), closes: s.closes.slice(0, end), lastTradeDates: s.lastTradeDates.slice(0, end) };
    } catch (err) {
      return { t, error: err.message };
    }
  });

  const ok = results.filter((r) => !r.error && r.closes.length);
  const failed = results.filter((r) => r.error || !r.closes?.length);
  const rate = ok.length / active.length;

  console.log(`\n수집 ${ok.length}/${active.length} (${(rate * 100).toFixed(1)}%)`);
  if (failed.length) {
    console.log(`실패 ${failed.length}개: ${failed.slice(0, 8).map((f) => `${f.t.code}(${f.error ?? "0건"})`).join(", ")}${failed.length > 8 ? " …" : ""}`);
  }
  if (rate < 0.95) throw new Error(`성공률 ${(rate * 100).toFixed(1)}% — 반쪽 데이터는 발행하지 않습니다`);

  // ── 그리드 ──────────────────────────────────────────────
  let minKey = null;
  for (const r of ok) {
    const first = r.weekKeys[0];
    if (!minKey || first < minKey) minKey = first;
  }
  const weeks = weekRange(minKey, lastWeek);
  const indexOf = new Map(weeks.map((k, i) => [k, i]));

  // 축·툴팁 라벨은 그 주차의 한국장 마지막 거래일. 한국 데이터가 없는 주는 금요일로 폴백
  const labels = weeks.map((k) => weekKeyToFriday(k));
  for (const r of ok) {
    if (r.t.market !== "KR") continue;
    for (let i = 0; i < r.weekKeys.length; i++) {
      const idx = indexOf.get(r.weekKeys[i]);
      if (idx !== undefined) labels[idx] = r.lastTradeDates[i];
    }
  }

  // ── 종목 파일 ───────────────────────────────────────────
  const tickers = [];
  let written = 0;
  for (const r of ok) {
    const series = toGridSeries(r.weekKeys, r.closes, indexOf);
    if (!series) continue;
    const dir = r.t.market === "US" ? "us" : "kr";
    const payload = { c: r.t.code, o: series.o, v: series.v };
    if (r.t.market === "US") payload.cur = "USD";
    if (await writeJsonIfChanged(new URL(`${dir}/${r.t.code}.json`, OUT), payload)) written++;

    const entry = { c: r.t.code, n: r.t.name, s: r.t.slug, k: r.t.kind, m: r.t.market, o: series.o };
    if (r.t.nameEng) entry.e = r.t.nameEng;
    if (r.t.sector) entry.g = r.t.sector;
    tickers.push(entry);
  }

  // 비활성 종목도 목록에 남긴다 — 검색에서는 숨기지만 이미 공유된 URL은 살아 있어야 한다.
  // 시세는 다시 수집하지 않고 기존 파일의 오프셋을 그대로 읽는다
  for (const t of universe.tickers.filter((x) => x.active === false)) {
    const dir = t.market === "US" ? "us" : "kr";
    const prev = await readJsonIfExists(new URL(`${dir}/${t.code}.json`, OUT));
    if (!prev) continue;
    const entry = { c: t.code, n: t.name, s: t.slug, k: t.kind, m: t.market, o: prev.o, a: 0 };
    if (t.nameEng) entry.e = t.nameEng;
    tickers.push(entry);
  }

  // ── 메타 ────────────────────────────────────────────────
  const fx = buildFxByWeek(fxDaily, weeks);
  const fxSource = fxDaily[fxDaily.length - 1]?.src ?? "naver";

  const metaChanged = await writeJsonIfChanged(new URL("meta.json", OUT), {
    v: 2,
    asOfWeek: lastWeek,
    asOfDate: labels[labels.length - 1],
    includesDividend: false,
    sources: { kr: krSource.SOURCE_ID, us: usSource.SOURCE_ID, fx: fxSource },
    weeks: labels,
    fx,
  });

  // 검색 목록과 별칭을 나눈다 — 별칭은 URL 해석(308 리다이렉트)용이라 서버만 읽고,
  // 클라이언트 검색은 이름·코드·초성으로 충분하다. 브라우저가 받을 양이 27% 줄어든다
  const tickersChanged = await writeJsonIfChanged(new URL("tickers.json", OUT), {
    tickers: tickers.sort((a, b) => a.c.localeCompare(b.c)),
  });
  const aliasChanged = await writeJsonIfChanged(new URL("aliases.json", OUT), universe.aliases ?? {});

  const inactive = tickers.filter((t) => t.a === 0).length;
  if (inactive) console.log(`비활성 ${inactive}개를 목록에 유지 (검색 제외, 직링크 유지)`);
  console.log(`\n그리드 ${weeks.length}주 (${weeks[0]} ~ ${lastWeek}) / 라벨 ${labels[0]} ~ ${labels[labels.length - 1]}`);
  console.log(`환율 ${fx.v.length}주 (오프셋 ${fx.o}, 소스 ${fxSource}) — 마지막 ${fx.v[fx.v.length - 1]}원`);
  console.log(
    `변경: 종목 ${written}개 파일, meta ${metaChanged ? "갱신" : "동일"}, ` +
      `tickers ${tickersChanged ? "갱신" : "동일"}, aliases ${aliasChanged ? "갱신" : "동일"}`
  );
  console.log(`\n완료 — ${((Date.now() - started) / 1000).toFixed(1)}초`);
};

main().catch((err) => {
  console.error(`\n실패: ${err.message}`);
  process.exit(1);
});
