import type { Metadata } from "next";

import BoardView from "@/components/board/BoardView";
import PageContainer from "@/components/layout/PageContainer";
import { SITE_SUFFIX } from "@/lib/site";
import { createServerClient, isBoardEnabled } from "@/lib/supabase/server";
import type { BoardPost } from "@/types/board";

// 게시글은 실시간이라 정적 생성 대상이 아니다
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건의사항",
  description:
    "Stock Trends에 바라는 점, 추가했으면 하는 종목이나 기능을 남겨주세요. 로그인 없이 바로 쓸 수 있습니다.",
  alternates: { canonical: "/board" },
  openGraph: { title: `건의사항 | ${SITE_SUFFIX}`, url: "/board" },
};

const PAGE_SIZE = 20;

const loadFirstPage = async (): Promise<{
  posts: BoardPost[];
  cursor: string | null;
}> => {
  if (!isBoardEnabled()) return { posts: [], cursor: null };

  const supabase = createServerClient();
  const { data } = await supabase
    .from("posts")
    .select("id, nickname, body, ticker_code, created_at, edited_at")
    .is("deleted_at", null)
    .eq("shadowbanned", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const posts: BoardPost[] = rows.slice(0, PAGE_SIZE).map((r) => ({
    id: String(r.id),
    nickname: String(r.nickname),
    body: String(r.body),
    tickerCode: (r.ticker_code as string | null) ?? null,
    createdAt: String(r.created_at),
    editedAt: (r.edited_at as string | null) ?? null,
  }));

  return {
    posts,
    cursor: hasMore ? posts[posts.length - 1].createdAt : null,
  };
};

export default async function BoardPage() {
  const enabled = isBoardEnabled();
  const { posts, cursor } = await loadFirstPage();

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold tracking-tight">건의사항</h1>
      <p className="text-ink-2 mt-1 text-[13px]">
        바라는 점이나 추가했으면 하는 종목·기능을 남겨주세요. 로그인 없이 바로
        쓸 수 있습니다.
      </p>

      <div className="mt-5">
        {enabled ? (
          <BoardView initialPosts={posts} initialCursor={cursor} />
        ) : (
          <p className="border-hairline text-ink-muted border border-dashed px-4 py-10 text-center text-[13px]">
            게시판을 준비 중입니다. 곧 열립니다.
          </p>
        )}
      </div>

      <p className="text-ink-muted mt-6 text-[12px] leading-relaxed">
        닉네임은 자동으로 만들어지며 수정할 수 없습니다. 작성한 글은 이
        브라우저에서만 삭제할 수 있습니다 — 삭제 권한을 브라우저에 저장하기
        때문입니다.
        <br />
        스팸 방지를 위해 접속 IP를 단방향 해시로 저장하며, 원래 주소는 복원할 수
        없습니다.
      </p>
    </PageContainer>
  );
}
