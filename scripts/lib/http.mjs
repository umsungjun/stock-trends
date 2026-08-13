/**
 * HTTP 공통 — 재시도·백오프·동시성 제한.
 * 기존 sources/naver.mjs에 흩어져 있던 것을 승격해 어댑터들이 공유한다.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @description 재시도·선형 백오프가 붙은 fetch. 응답 본문을 문자열로 돌려준다.
 * @param {string} url
 * @param {{retries?: number, headers?: Record<string,string>, method?: string, body?: string, timeoutMs?: number}} [opts]
 * @returns {Promise<string>}
 */
export const fetchText = async (url, opts = {}) => {
  const { retries = 3, headers = {}, method = "GET", body, timeoutMs = 20_000 } = opts;
  let lastErr;

  for (let attempt = 0; attempt < retries; attempt++) {
    const ctl = AbortSignal.timeout(timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        body,
        signal: ctl,
        headers: { "User-Agent": UA, Referer: "https://finance.naver.com/", ...headers },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      // 선형 백오프 — 상대 서버를 몰아치지 않기 위함. 마지막 시도 후에는 대기하지 않는다
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw new Error(`${url} 실패: ${lastErr?.message}`);
};

/** @description fetchText + JSON 파싱 */
export const fetchJson = async (url, opts = {}) => JSON.parse(await fetchText(url, opts));

/** @description JSON 본문 POST */
export const postJson = async (url, payload, opts = {}) =>
  JSON.parse(
    await fetchText(url, {
      ...opts,
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    })
  );

/**
 * @description 동시 실행 수를 제한하며 순차 소비한다. 종목이 수천 개로 늘어도 이 값은 유지한다.
 * @param {T[]} items
 * @param {number} limit - 동시 실행 상한
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>} 입력 순서가 보존된 결과 배열
 * @template T, R
 */
export const pooled = async (items, limit, worker) => {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await worker(items[i], i);
      }
    })
  );
  return out;
};

export { UA };
