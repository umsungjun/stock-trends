import NotFoundPrompt from "@/components/compare/NotFoundPrompt";
import PopularComparisons from "@/components/compare/PopularComparisons";
import PageContainer from "@/components/layout/PageContainer";
import { getRelatedComparisons } from "@/lib/market/related.server";

/**
 * 404를 이탈이 아니라 전환 지점으로 만든다 — 시도한 종목명을 보여주고 추가 요청을 유도한다.
 * 서버 컴포넌트라 경로를 알 수 없어 NotFoundPrompt가 클라이언트에서 읽는다.
 *
 * ⚠️ 루트 not-found.tsx에 `export const metadata`를 두면 **렌더가 조용히 실패한다.**
 *    에러도 로그도 없이 본문만 비어서 원인을 찾기가 매우 어렵다.
 *    noindex는 [slug]/page.tsx의 generateMetadata가 해석 실패 시 이미 붙이고 있다.
 */
export default async function NotFound() {
  const related = await getRelatedComparisons([], 10);

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold tracking-tight">
        종목을 찾을 수 없습니다
      </h1>
      <NotFoundPrompt />
      <PopularComparisons items={related} title="이런 조합은 어떠세요" />
    </PageContainer>
  );
}
