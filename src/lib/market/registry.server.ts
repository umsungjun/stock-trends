import { cache } from "react";

import { choseong } from "@/lib/market/search";
import type { SlugResolver } from "@/lib/market/slug";
import type {
  MarketMeta,
  RawSeries,
  RawTicker,
  Series,
  Ticker,
} from "@/types/market";

import { readFile } from "node:fs/promises";
import path from "node:path";
import "server-only";

/**
 * 서버 전용 데이터 로더.
 *
 * ⚠️ 여기서 읽는 public/data 경로는 next.config.ts의 outputFileTracingIncludes에
 *    등록되어 있어야 한다. 사전 생성분은 빌드 타임에 읽으니 정상 동작하고,
 *    **배포 후 새 조합을 온디맨드로 처음 열 때만** 파일이 없어 500이 난다.
 */

const dataPath = (...parts: string[]) =>
  path.join(process.cwd(), "public", "data", ...parts);

const readJson = async <T>(...parts: string[]): Promise<T> =>
  JSON.parse(await readFile(dataPath(...parts), "utf8")) as T;

/**
 * 모듈 레벨 싱글턴.
 *
 * React.cache는 **요청 단위**라 빌드 시 페이지마다 초기화된다. 사전 생성 4,600여 페이지가
 * 각자 tickers.json(280KB)을 다시 파싱하면 빌드 시간이 폭발한다.
 * 프로세스 안에 Promise 캐시를 한 겹 더 둬서 파일을 한 번만 읽는다.
 */
const once = new Map<string, Promise<unknown>>();
const singleton = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = once.get(key);
  if (hit) return hit as Promise<T>;
  const created = load();
  once.set(key, created);
  return created;
};

/** @description 주차 그리드와 환율. 모든 페이지가 필요로 한다 */
export const getMeta = cache((): Promise<MarketMeta> =>
  singleton("meta", () => readJson<MarketMeta>("meta.json"))
);

/** @description 전체 종목 목록. 초성은 여기서 한 번만 계산한다 */
export const getTickers = cache((): Promise<Ticker[]> =>
  singleton("tickers", async () => {
    const raw = await readJson<{ tickers: RawTicker[] }>("tickers.json");
    return raw.tickers.map((t) => ({
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
    }));
  })
);

/** @description 코드 → 종목 메타 */
export const getTickerMap = cache((): Promise<Map<string, Ticker>> =>
  singleton("tickerMap", async () => {
    const tickers = await getTickers();
    return new Map(tickers.map((t) => [t.code, t]));
  })
);

/**
 * @description 슬러그 해석에 쓰는 조회 맵. 별칭은 서버만 필요하므로 여기서만 읽는다
 * (클라이언트 검색은 이름·코드·초성으로 충분해서 aliases.json을 받지 않는다).
 */
export const getSlugResolver = cache((): Promise<SlugResolver> =>
  singleton("slugResolver", async () => {
    const [tickers, aliases] = await Promise.all([
      getTickers(),
      readJson<Record<string, string>>("aliases.json"),
    ]);
    return {
      bySlug: new Map(tickers.map((t) => [t.slug, t.code])),
      byAlias: new Map(Object.entries(aliases)),
      slugOf: new Map(tickers.map((t) => [t.code, t.slug])),
    };
  })
);

/**
 * @description 종목 시계열을 읽는다. 파일이 없으면 null (유니버스에는 있지만 수집이 실패한 경우).
 *
 * 인기 조합이 서로 겹치므로 빌드 중 같은 종목을 수백 번 요청한다 — 싱글턴 캐시가 크게 듣는다.
 * @param code - 종목 코드
 * @param market - 시장 (파일 경로가 갈린다)
 */
export const getSeries = cache(
  (code: string, market: "KR" | "US"): Promise<Series | null> =>
    singleton(`series:${market}:${code}`, async () => {
      try {
        const raw = await readJson<RawSeries>(
          market === "US" ? "us" : "kr",
          `${code}.json`
        );
        return { code, offset: raw.o, values: raw.v, market };
      } catch {
        return null;
      }
    })
);

/** @description 여러 종목을 한 번에. 실패한 것은 결과에서 빠진다 */
export const getSeriesMany = async (
  picks: { code: string; market: "KR" | "US" }[]
): Promise<Series[]> => {
  const loaded = await Promise.all(
    picks.map((p) => getSeries(p.code, p.market))
  );
  return loaded.filter((s): s is Series => s !== null);
};

/** @description 사전 생성 대상 슬러그. sitemap과 generateStaticParams가 같은 파일을 읽는다 */
export const getPopularSlugs = cache((): Promise<string[]> =>
  singleton("popularSlugs", async () => {
    try {
      return await readJson<string[]>("popular-slugs.json");
    } catch {
      return [];
    }
  })
);
