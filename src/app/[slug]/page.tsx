import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import CompareView from "@/components/compare/CompareView";
import DataFootnote from "@/components/compare/DataFootnote";
import PopularComparisons from "@/components/compare/PopularComparisons";
import PageContainer from "@/components/layout/PageContainer";
import { pct, won, ymd } from "@/lib/format";
import { compute } from "@/lib/market/compute";
import { DEFAULT_AMOUNT, DEFAULT_PERIOD } from "@/lib/market/constants";
import {
  getMeta,
  getPopularSlugs,
  getSeriesMany,
  getSlugResolver,
  getStarterTickers,
  getTickerMap,
} from "@/lib/market/registry.server";
import { getRelatedComparisons } from "@/lib/market/related.server";
import { parseSlug } from "@/lib/market/slug";
import { SITE_URL } from "@/lib/site";

/**
 * 온디맨드 생성 + 무기한 캐시. revalidate를 두지 않는 것이 의도다 —
 * 데이터는 커밋으로만 바뀌고, 커밋이 곧 재배포이며 재배포가 캐시를 전부 무효화한다.
 * 시간 기반 재검증은 바뀌지도 않은 페이지를 주기적으로 다시 만드는 낭비다.
 */
export const dynamic = "force-static";
export const dynamicParams = true;

/** 사전 생성 목록은 sitemap과 같은 파일을 읽는다 — 둘이 어긋나는 사고를 구조적으로 막는다 */
export async function generateStaticParams() {
  const slugs = await getPopularSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** 슬러그를 해석해 계산까지 마친 결과. 메타데이터와 본문이 공유한다 */
const resolve = async (raw: string) => {
  const [resolver, meta, tickerMap] = await Promise.all([
    getSlugResolver(),
    getMeta(),
    getTickerMap(),
  ]);

  const parsed = parseSlug(decodeURIComponent(raw), resolver);
  if (!parsed.codes.length) return null;

  const tickers = parsed.codes
    .map((c) => tickerMap.get(c))
    .filter((t) => t !== undefined);
  const series = await getSeriesMany(
    tickers.map((t) => ({ code: t.code, market: t.market }))
  );
  const { range, rows } = compute(
    series,
    DEFAULT_PERIOD,
    DEFAULT_AMOUNT,
    meta.weeks.length,
    meta.fx
  );

  return { parsed, meta, tickers, series, range, rows };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await resolve(slug);
  if (!data)
    return { title: "종목을 찾을 수 없습니다", robots: { index: false } };

  const { parsed, meta, tickers, range, rows } = data;
  const names = tickers.map((t) => t.name).join(" vs ");
  const canonical = `/${parsed.canonical}`;

  // 순위와 클릭을 만드는 건 SVG가 아니라 이 숫자다
  const sorted = [...rows].sort((a, b) => b.final - a.final);
  const detail = sorted
    .map((r) => {
      const name = tickers.find((t) => t.code === r.code)?.name ?? r.code;
      return `${name} ${won(r.final)}원(연 ${pct(r.cagr)})`;
    })
    .join(", ");

  return {
    title: names,
    description: `${ymd(meta.weeks[range.start])}에 ${won(DEFAULT_AMOUNT)}원을 넣었다면 ${ymd(meta.asOfDate)} 기준 ${detail}. 최대 낙폭과 환율 기여분까지 한 화면에서 비교.`,
    alternates: { canonical },
    openGraph: { title: names, url: canonical, type: "website" },
    // 일부만 해석된 조합은 색인에서 제외한다 — canonical로 링크 자산을 모은다
    robots: parsed.unresolved.length
      ? { index: false, follow: true }
      : undefined,
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const data = await resolve(slug);

  // 해석 실패는 404로 보낸다. 200으로 응답하면 오타 URL이 소프트 404로 색인에 쌓인다
  if (!data) notFound();

  const { parsed, meta, tickers, series } = data;

  // 별칭·대소문자·NFD·중복·6개 초과를 전부 여기서 흡수해 링크 자산을 canonical 하나로 모은다
  // 한글 경로를 그대로 넘기면 Location 헤더(ByteString)로 못 담아 터진다
  if (parsed.canonical !== decoded) {
    permanentRedirect(`/${encodeURIComponent(parsed.canonical)}`);
  }

  // 종목을 다 지우면 이 페이지도 빈 상태가 되므로 복구 수단이 필요하다
  const [related, starters] = await Promise.all([
    getRelatedComparisons(parsed.codes),
    getStarterTickers(),
  ]);

  return (
    <PageContainer>
      <CompareView
        initialTickers={tickers}
        initialSeries={series}
        starters={starters}
        weeks={meta.weeks}
        fx={meta.fx}
        host={new URL(SITE_URL).host}
      />

      <PopularComparisons items={related} />

      <DataFootnote meta={meta} />
    </PageContainer>
  );
}
