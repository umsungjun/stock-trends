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
 *
 * 모든 로더를 React.cache()로 감싸는 것이 필수다. 수천 페이지를 사전 생성할 때
 * 요청마다 tickers.json(280KB)을 다시 파싱하면 빌드 시간이 폭발한다.
 */

const dataPath = (...parts: string[]) =>
  path.join(process.cwd(), "public", "data", ...parts);

const readJson = async <T>(...parts: string[]): Promise<T> =>
  JSON.parse(await readFile(dataPath(...parts), "utf8")) as T;

/** @description 주차 그리드와 환율. 모든 페이지가 필요로 한다 */
export const getMeta = cache(async (): Promise<MarketMeta> =>
  readJson<MarketMeta>("meta.json")
);

/** @description 전체 종목 목록. 초성은 여기서 한 번만 계산한다 */
export const getTickers = cache(async (): Promise<Ticker[]> => {
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
  }));
});

/** @description 코드 → 종목 메타 */
export const getTickerMap = cache(async (): Promise<Map<string, Ticker>> => {
  const tickers = await getTickers();
  return new Map(tickers.map((t) => [t.code, t]));
});

/**
 * @description 슬러그 해석에 쓰는 조회 맵. 별칭은 서버만 필요하므로 여기서만 읽는다
 * (클라이언트 검색은 이름·코드·초성으로 충분해서 aliases.json을 받지 않는다).
 */
export const getSlugResolver = cache(async (): Promise<SlugResolver> => {
  const [tickers, aliases] = await Promise.all([
    getTickers(),
    readJson<Record<string, string>>("aliases.json"),
  ]);

  return {
    bySlug: new Map(tickers.map((t) => [t.slug, t.code])),
    byAlias: new Map(Object.entries(aliases)),
    slugOf: new Map(tickers.map((t) => [t.code, t.slug])),
  };
});

/**
 * @description 종목 시계열을 읽는다. 파일이 없으면 null (유니버스에는 있지만 수집이 실패한 경우).
 * @param code - 종목 코드
 * @param market - 시장 (파일 경로가 갈린다)
 */
export const getSeries = cache(
  async (code: string, market: "KR" | "US"): Promise<Series | null> => {
    try {
      const raw = await readJson<RawSeries>(
        market === "US" ? "us" : "kr",
        `${code}.json`
      );
      return { code, offset: raw.o, values: raw.v, market };
    } catch {
      return null;
    }
  }
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

/** @description 사전 생성 대상 슬러그 목록. sitemap과 generateStaticParams가 함께 읽는다 */
export const getPopularSlugs = cache(async (): Promise<string[]> => {
  try {
    return await readJson<string[]>("popular-slugs.json");
  } catch {
    return [];
  }
});
