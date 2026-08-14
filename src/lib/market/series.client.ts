/**
 * 클라이언트 시세 로더 — 종목을 고를 때 한 번만 받고 메모리에 캐시한다.
 *
 * 뺐다 다시 담아도 재요청하지 않는다. 기간·투자금을 바꿀 때도 네트워크 요청이 없다 —
 * 이미 받은 배열로 다시 계산할 뿐이다. 프로토타입의 loadSeries 성질을 그대로 옮겼다.
 */
import type {
  Market,
  RawSeries,
  RawTicker,
  Series,
  Ticker,
} from "@/types/market";

import { choseong } from "./search";

/** 진행 중인 요청도 캐시한다 — 같은 종목을 연속으로 누를 때 중복 요청을 막는다 */
const seriesCache = new Map<string, Promise<Series | null>>();
let tickersCache: Promise<Ticker[]> | null = null;

const fetchJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
};

/**
 * @description 종목 시계열을 받는다 (약 2.5KB gzip). 실패하면 null.
 * @param code - 종목 코드
 * @param market - 시장
 */
export const loadSeries = (
  code: string,
  market: Market
): Promise<Series | null> => {
  const key = `${market}:${code}`;
  const hit = seriesCache.get(key);
  if (hit) return hit;

  const promise = fetchJson<RawSeries>(
    `/data/${market === "US" ? "us" : "kr"}/${code}.json`
  )
    .then((raw) => ({ code, offset: raw.o, values: raw.v, market }))
    .catch(() => {
      seriesCache.delete(key); // 실패는 캐시하지 않는다 — 일시적 오류면 다시 시도할 수 있게
      return null;
    });

  seriesCache.set(key, promise);
  return promise;
};

/**
 * @description 검색용 종목 목록 (약 48KB gzip). 검색창 첫 포커스에 지연 로드한다 —
 * 첫 화면에서는 필요 없으므로 초기 전송량에 넣지 않는다.
 */
export const loadTickers = (): Promise<Ticker[]> => {
  if (tickersCache) return tickersCache;

  tickersCache = fetchJson<{ tickers: RawTicker[] }>("/data/tickers.json")
    .then((raw) =>
      raw.tickers.map((t) => ({
        code: t.c,
        name: t.n,
        slug: t.s,
        kind: t.k,
        market: t.m,
        offset: t.o,
        englishName: t.e,
        sector: t.g,
        choseong: choseong(t.n),
        active: t.a !== 0,
      }))
    )
    .catch((err) => {
      tickersCache = null;
      throw err;
    });

  return tickersCache;
};

/** @description 서버가 주입한 시계열을 캐시에 심는다. 첫 렌더 후 같은 종목을 다시 받지 않게 한다 */
export const primeSeries = (series: Series[]): void => {
  for (const s of series) {
    seriesCache.set(`${s.market}:${s.code}`, Promise.resolve(s));
  }
};
