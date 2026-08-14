import CompareView from "@/components/compare/CompareView";
import DataFootnote from "@/components/compare/DataFootnote";
import HeadlineSummary from "@/components/compare/HeadlineSummary";
import PopularComparisons from "@/components/compare/PopularComparisons";
import PageContainer from "@/components/layout/PageContainer";
import { compute } from "@/lib/market/compute";
import {
  DEFAULT_AMOUNT,
  DEFAULT_CODES,
  DEFAULT_PERIOD,
} from "@/lib/market/constants";
import {
  getMeta,
  getSeriesMany,
  getTickerMap,
} from "@/lib/market/registry.server";
import { getRelatedComparisons } from "@/lib/market/related.server";
import { HOME_HEADING, HOME_SUBHEADING, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default async function HomePage() {
  const [meta, tickerMap] = await Promise.all([getMeta(), getTickerMap()]);

  const tickers = DEFAULT_CODES.map((c) => tickerMap.get(c)).filter(
    (t) => t !== undefined
  );
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

  const related = await getRelatedComparisons(DEFAULT_CODES);

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold tracking-tight">{HOME_HEADING}</h1>
      <p className="text-ink-2 mt-1 text-[13px]">{HOME_SUBHEADING}</p>

      <div className="mt-5">
        <HeadlineSummary
          rows={rows}
          range={range}
          names={Object.fromEntries(tickers.map((t) => [t.code, t.name]))}
          weeks={meta.weeks}
          amount={DEFAULT_AMOUNT}
        />
      </div>

      <div className="mt-4">
        <CompareView
          initialTickers={tickers}
          initialSeries={series}
          weeks={meta.weeks}
          fx={meta.fx}
          host={new URL(SITE_URL).host}
        />
      </div>

      <PopularComparisons items={related} />

      <DataFootnote meta={meta} />
    </PageContainer>
  );
}
