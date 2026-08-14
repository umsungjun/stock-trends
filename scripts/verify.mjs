/**
 * 산출물 검증 게이트 — 커밋 전에 반드시 통과해야 한다.
 *
 *   node scripts/verify.mjs
 *
 * 반쪽 데이터를 발행하지 않는 것이 목적이다. 특히 fx에 구멍이 나면 미국 계열 전체가
 * 조용히 붕괴하는데, 화면에서는 "값이 좀 이상한데?" 수준으로만 보여 발견이 늦다.
 *
 * 환경변수 ALLOW_HISTORY_REWRITE=1 이면 과거 구간 대량 변경 검사를 건너뛴다 (액면분할 등 정당한 경우).
 */

import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { readJsonIfExists } from "./lib/io.mjs";
import { isoWeekKey, weekRange } from "./lib/week.mjs";
import { toSlug } from "./universe/rules.mjs";

const OUT = new URL("../public/data/", import.meta.url);

const problems = [];
const fail = (msg) => problems.push(msg);

const check = async () => {
  const meta = await readJsonIfExists(new URL("meta.json", OUT));
  const tickersFile = await readJsonIfExists(new URL("tickers.json", OUT));

  if (!meta) return fail("meta.json 없음");
  if (!tickersFile?.tickers?.length) return fail("tickers.json 없음 또는 비어 있음");

  const { weeks, fx } = meta;
  const tickers = tickersFile.tickers;

  // ── 주차 그리드 ─────────────────────────────────────────
  if (!Array.isArray(weeks) || !weeks.length) fail("meta.weeks 비어 있음");
  else {
    const expected = weekRange(isoWeekKey(weeks[0]), meta.asOfWeek);
    if (expected.length !== weeks.length) {
      fail(`주차 그리드에 결손: 기대 ${expected.length}주, 실제 ${weeks.length}주`);
    }
    const unsorted = weeks.findIndex((w, i) => i > 0 && w <= weeks[i - 1]);
    if (unsorted > 0) fail(`weeks 정렬 위반: index ${unsorted} (${weeks[unsorted - 1]} → ${weeks[unsorted]})`);
    if (isoWeekKey(weeks[weeks.length - 1]) !== meta.asOfWeek) {
      fail(`asOfWeek(${meta.asOfWeek})와 마지막 주차(${isoWeekKey(weeks[weeks.length - 1])}) 불일치`);
    }
  }

  // ── 환율 ────────────────────────────────────────────────
  if (!fx?.v?.length) fail("meta.fx 없음");
  else {
    const bad = fx.v.findIndex((r) => !Number.isFinite(r) || r < 500 || r > 3000);
    if (bad >= 0) fail(`환율 이상값: index ${bad} = ${fx.v[bad]} (범위 500~3000 밖)`);
    if (fx.o + fx.v.length !== weeks.length) {
      fail(`환율이 그리드 끝까지 닿지 않음: fx는 ${fx.o + fx.v.length}주, 그리드는 ${weeks.length}주`);
    }
  }

  // ── 종목 파일 ───────────────────────────────────────────
  const dirs = { kr: [], us: [] };
  for (const m of ["kr", "us"]) {
    try {
      dirs[m] = (await readdir(fileURLToPath(new URL(`${m}/`, OUT)))).filter((f) => f.endsWith(".json"));
    } catch {
      fail(`public/data/${m}/ 없음`);
    }
  }
  const fileCount = dirs.kr.length + dirs.us.length;
  // 파일이 더 많은 것은 정상이다 — 유니버스에서 밀려난 종목도 직링크 유지를 위해 남긴다
  if (fileCount < tickers.length) {
    fail(`파일 ${fileCount}개 < tickers ${tickers.length}개 — 목록에 있는데 파일이 없다`);
  }

  let usWithoutFx = 0;
  for (const t of tickers) {
    const dir = t.m === "US" ? "us" : "kr";
    const d = await readJsonIfExists(new URL(`${dir}/${t.c}.json`, OUT));
    if (!d) { fail(`${dir}/${t.c}.json 없음 (tickers에는 있음)`); continue; }
    if (d.o !== t.o) fail(`${t.c}: 오프셋 불일치 (파일 ${d.o}, tickers ${t.o})`);
    if (d.o + d.v.length > weeks.length) fail(`${t.c}: 그리드를 넘침 (${d.o}+${d.v.length} > ${weeks.length})`);
    if (d.v.some((v) => !Number.isFinite(v) || v <= 0)) fail(`${t.c}: 유효하지 않은 종가 포함`);
    // 미국 종목이 환율보다 먼저 시작하면 그 구간은 원화 환산이 불가능하다
    if (t.m === "US" && d.o < fx.o) usWithoutFx++;
  }
  if (usWithoutFx) fail(`미국 종목 ${usWithoutFx}개가 환율 시작(index ${fx.o}) 이전부터 시작 — 환산 불가 구간 발생`);

  // ── 슬러그 ──────────────────────────────────────────────
  const slugs = tickers.map((t) => t.s);
  const dup = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];
  if (dup.length) fail(`슬러그 중복 ${dup.length}개: ${dup.slice(0, 5).join(", ")}`);
  const empty = tickers.filter((t) => !t.s).length;
  if (empty) fail(`슬러그 없는 종목 ${empty}개`);
  const dirty = tickers.filter((t) => /[&()+~\s./]/.test(t.s));
  if (dirty.length) fail(`슬러그에 URL 위험 문자: ${dirty.slice(0, 3).map((t) => t.s).join(", ")}`);

  // 앱은 사용자 입력을 toSlug로 정규화한 뒤 조회한다. 슬러그가 정규화에 불변이 아니면
  // 그 종목은 URL로 도달할 수 없다 (충돌 접미사에 하이픈을 쓰면 실제로 그렇게 된다)
  const unstable = tickers.filter((t) => toSlug(t.s) !== t.s);
  if (unstable.length) {
    fail(`정규화에 불변이 아닌 슬러그 ${unstable.length}개: ${unstable.slice(0, 3).map((t) => `${t.s}→${toSlug(t.s)}`).join(", ")}`);
  }

  await checkHistoryRewrite(tickers.length);

  return { meta, tickers, fileCount };
};

/** 주간 갱신에서 정상적인 변경은 배열 끝에 값이 하나 붙는 것뿐이다 */
const TAIL_TOLERANCE = 3;
/** 이 비율을 넘는 종목의 과거 구간이 동시에 바뀌면 소스 버그로 본다 */
const REWRITE_RATIO = 0.02;

/**
 * @description 과거 구간이 대량으로 다시 쓰였는지 검사한다.
 *
 * 액면분할은 종목 단위로 일어나므로 몇 개는 정상이다. 하지만 수백 개가 한꺼번에 바뀌면
 * 소스의 조정 기준이 통째로 달라진 것이고, 그대로 커밋하면 전 구간 수익률이 조용히 틀어진다.
 * 정당한 경우에는 ALLOW_HISTORY_REWRITE=1로 통과시킨다.
 * @param total - 전체 종목 수
 */
const checkHistoryRewrite = async (total) => {
  if (process.env.ALLOW_HISTORY_REWRITE) return;

  let changed;
  try {
    changed = execFileSync(
      "git",
      ["diff", "--name-only", "HEAD", "--", "public/data/kr", "public/data/us"],
      { encoding: "utf8" }
    )
      .split("\n")
      .filter((f) => f.endsWith(".json"));
  } catch {
    return; // git이 없거나 첫 커밋 — 비교할 이전 버전이 없다
  }
  if (!changed.length) return;

  let rewritten = 0;
  const samples = [];

  for (const file of changed) {
    let prev;
    try {
      prev = JSON.parse(
        execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" })
      );
    } catch {
      continue; // 새로 추가된 종목
    }
    const curr = JSON.parse(await readFile(file, "utf8"));

    const head = Math.max(0, prev.v.length - TAIL_TOLERANCE);
    const movedStart = prev.o !== curr.o;
    const pastChanged = prev.v.slice(0, head).some((v, i) => v !== curr.v[i]);

    if (movedStart || pastChanged) {
      rewritten++;
      if (samples.length < 5) samples.push(file.split("/").pop());
    }
  }

  const ratio = total ? rewritten / total : 0;
  if (ratio > REWRITE_RATIO) {
    fail(
      `과거 구간이 다시 쓰인 종목 ${rewritten}개 (${(ratio * 100).toFixed(1)}%) — ` +
        `소스 기준이 바뀌었을 수 있습니다: ${samples.join(", ")}. ` +
        `정당한 변경이면 ALLOW_HISTORY_REWRITE=1로 재실행하세요`
    );
  } else if (rewritten) {
    console.log(`  과거 구간 변경 ${rewritten}개 (액면분할 등, 허용 범위)`);
  }
};

const main = async () => {
  const result = await check();

  if (problems.length) {
    console.error(`검증 실패 — ${problems.length}건\n`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  const { meta, tickers, fileCount } = result;
  const kr = tickers.filter((t) => t.m === "KR").length;
  console.log("검증 통과");
  console.log(`  주차 ${meta.weeks.length}개 (${meta.weeks[0]} ~ ${meta.asOfDate}, ${meta.asOfWeek})`);
  console.log(`  환율 ${meta.fx.v.length}주, 소스 ${meta.sources.fx}`);
  console.log(`  종목 ${tickers.length}개 (한국 ${kr} / 미국 ${tickers.length - kr}), 파일 ${fileCount}개`);
};

main().catch((err) => {
  console.error(`검증 중 오류: ${err.message}`);
  process.exit(1);
});
