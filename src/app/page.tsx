import CompareView from "@/components/compare/CompareView";
import DataFootnote from "@/components/compare/DataFootnote";
import PopularComparisons from "@/components/compare/PopularComparisons";
import PageContainer from "@/components/layout/PageContainer";
import { getMeta, getStarterTickers } from "@/lib/market/registry.server";
import { getRelatedComparisons } from "@/lib/market/related.server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * 홈은 빈 비교 화면이다. 기본 조합으로 채우지 않는 이유는 URL 왕복 대칭이다 —
 * `/`가 종목 없음을 뜻해야 비교 중 종목을 다 지운 뒤 새로고침해도 같은 상태로 돌아온다.
 * 시작점은 추천 칩과 아래 내부 링크가 맡는다.
 */
export default async function HomePage() {
  const [meta, starters] = await Promise.all([getMeta(), getStarterTickers()]);

  // 현재 종목이 없으므로 수기 라이벌 조합으로 채워진다
  const related = await getRelatedComparisons([]);

  return (
    <PageContainer>
      <CompareView
        initialTickers={[]}
        initialSeries={[]}
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
