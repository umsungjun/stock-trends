/**
 * 미국 심볼 해석 — 티커를 네이버가 받아들이는 reutersCode로 바꾼다.
 *
 * 개별주는 거래소 목록 API가 reutersCode를 확정값으로 주므로 이 경로가 필요 없다.
 * 하지만 **ETF는 목록 API에 아예 없어서**(AMEX 316건 전부 stock, SPY·VOO 없음)
 * 접미사 후보를 순회하며 실제로 응답하는 것을 찾아야 한다.
 *
 * 결과를 캐시한다. 음성 결과(null)도 캐시하는 게 핵심 — 안 그러면 매주 실패 심볼을 다시 두드린다.
 */

import { readJsonIfExists, writeJsonIfChanged } from "../lib/io.mjs";
import { fetchBasic, resolveCandidates } from "../sources/naver-foreign.mjs";

const CACHE = new URL("../../data/cache/resolve.json", import.meta.url);
const TTL_DAYS = 90; // 음성 결과도 분기마다 재확인 — 나중에 상장될 수 있다

const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86_400_000;

/**
 * @description 심볼들을 reutersCode로 해석한다. 캐시가 유효하면 요청하지 않는다.
 * @param {Array<{symbol: string, exchange?: string}>} items
 * @returns {Promise<{resolved: Map<string, {reutersCode: string, name: string}>, failed: string[]}>}
 */
export const resolveSymbols = async (items) => {
  const cache = (await readJsonIfExists(CACHE, {})) ?? {};
  const resolved = new Map();
  const failed = [];
  let probes = 0;

  for (const { symbol, exchange } of items) {
    const hit = cache[symbol];
    if (hit && daysSince(hit.checkedAt) < TTL_DAYS) {
      if (hit.reutersCode) resolved.set(symbol, { reutersCode: hit.reutersCode, name: hit.name });
      else failed.push(symbol);
      continue;
    }

    let found = null;
    let attempts = 0;
    for (const candidate of resolveCandidates(symbol, exchange)) {
      attempts++;
      probes++;
      const basic = await fetchBasic(candidate);
      if (basic) { found = { reutersCode: candidate, ...basic }; break; }
    }

    if (found) {
      cache[symbol] = { reutersCode: found.reutersCode, name: found.name, checkedAt: today(), attempts };
      resolved.set(symbol, { reutersCode: found.reutersCode, name: found.name });
    } else {
      cache[symbol] = { reutersCode: null, checkedAt: today(), note: "네이버 미지원" };
      failed.push(symbol);
    }
  }

  // 키 정렬 — PR 리뷰에서 diff가 읽히도록
  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  await writeJsonIfChanged(CACHE, sorted, { pretty: true });

  return { resolved, failed, probes };
};
