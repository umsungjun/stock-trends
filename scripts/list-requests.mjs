/**
 * 대기 중인 종목 추가 요청을 득표순으로 출력한다.
 *
 *   pnpm requests
 *
 * 유니버스 반영이 로컬에서 일어나므로 확인도 같은 자리에서 한다 — 목록을 보고
 * data/universe-extra.json에 추가한 뒤 pnpm data:universe를 돌리는 흐름이다.
 *
 * 읽기 전용이다. status를 added로 바꾸는 것은 실제로 발행된 뒤에 해야 하므로 여기서 하지 않는다.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음 — .env.local을 확인하라"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("ticker_requests")
  .select("raw_query, votes, status, note, created_at")
  .eq("status", "queued")
  .order("votes", { ascending: false })
  .order("created_at", { ascending: true });

if (error) {
  console.error(`조회 실패: ${error.message}`);
  process.exit(1);
}

if (!data.length) {
  console.log("대기 중인 요청 없음");
  process.exit(0);
}

console.log(`\n대기 중 ${data.length}건\n`);
for (const r of data) {
  const day = r.created_at.slice(0, 10);
  console.log(
    `  ${String(r.votes).padStart(3)}표  ${r.raw_query.padEnd(20)} ${day}`
  );
}
console.log(`\ndata/universe-extra.json에 추가 후 pnpm data:universe\n`);
