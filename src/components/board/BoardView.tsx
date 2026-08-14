"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { BoardListResponse, BoardPost } from "@/types/board";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import PostForm, { useMyTokens } from "./PostForm";

interface BoardViewProps {
  initialPosts: BoardPost[];
  initialCursor: string | null;
}

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
};

/**
 * @description 건의사항 목록과 작성 폼.
 *
 * 내 글 판정은 localStorage에 쌓인 토큰으로만 한다 — 서버가 IP로 판정하지 않기 때문이다.
 * @param props.initialPosts - 서버가 미리 읽어둔 첫 페이지
 * @param props.initialCursor - 다음 페이지 커서
 */
export default function BoardView({
  initialPosts,
  initialCursor,
}: BoardViewProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  // localStorage는 서버에 없다. useSyncExternalStore로 읽으면 hydration이 어긋나지 않고
  // effect에서 setState할 일도 없다 (서버 스냅샷은 항상 빈 객체)
  const tokens = useMyTokens();

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/board?cursor=${encodeURIComponent(cursor)}`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as BoardListResponse;
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch {
      toast.error("더 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const token = tokens[id];
    if (!token) return;

    const prev = posts;
    setPosts((p) => p.filter((x) => x.id !== id)); // 낙관적 제거
    try {
      const res = await fetch(`/api/board/${id}`, {
        method: "DELETE",
        headers: { "x-edit-token": token },
      });
      if (!res.ok) throw new Error();
      toast.success("삭제했습니다");
    } catch {
      setPosts(prev); // 조용한 롤백은 "눌렀는데 그대로"로 보인다
      toast.error("삭제하지 못했습니다");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PostForm onCreated={(p) => setPosts((prev) => [p, ...prev])} />

      {posts.length === 0 ? (
        <p className="border-hairline text-ink-muted border border-dashed px-4 py-10 text-center text-[13px]">
          아직 등록된 글이 없습니다. 첫 번째로 의견을 남겨주세요.
        </p>
      ) : (
        <ul className="border-hairline divide-hairline divide-y border">
          {posts.map((post) => (
            <li key={post.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">{post.nickname}</span>
                <span className="text-ink-muted text-[12px]">
                  {timeAgo(post.createdAt)}
                </span>
                {tokens[post.id] && (
                  <button
                    type="button"
                    onClick={() => remove(post.id)}
                    aria-label="내 글 삭제"
                    className="text-ink-muted hover:text-critical ml-auto flex h-6 w-6 cursor-pointer items-center justify-center transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                {post.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <Button
          type="button"
          variant="outline"
          onClick={loadMore}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? "불러오는 중…" : "더 보기"}
        </Button>
      )}
    </div>
  );
}
