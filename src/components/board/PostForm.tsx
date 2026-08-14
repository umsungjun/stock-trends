"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deriveNickname, randomSeed } from "@/lib/board/nickname";
import type { BoardPost, CreatePostResponse } from "@/types/board";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const MAX = 2000;
const TOKEN_KEY = "st:board-tokens";

/** 내 글 토큰을 localStorage에 쌓는다. IP로 소유권을 판정하지 않기 때문에 이게 유일한 증표다 */
const readTokens = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "{}");
  } catch {
    return {};
  }
};

const EMPTY: Record<string, string> = {};
let tokenSnapshot: Record<string, string> = EMPTY;
const listeners = new Set<() => void>();

const notify = () => {
  tokenSnapshot = readTokens();
  for (const fn of listeners) fn();
};

/**
 * @description 이 브라우저가 가진 글 삭제 토큰. 서버에서는 항상 빈 객체다.
 * useSyncExternalStore를 쓰면 hydration 불일치 없이 마운트 후 실제 값으로 전환된다.
 */
export const useMyTokens = (): Record<string, string> =>
  useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      if (tokenSnapshot === EMPTY) notify();
      return () => listeners.delete(onChange);
    },
    () => tokenSnapshot,
    () => EMPTY
  );

const saveToken = (id: string, token: string) => {
  try {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ ...readTokens(), [id]: token })
    );
    notify();
  } catch {
    // 시크릿 모드 등에서 저장 실패 — 글은 올라가되 내 글로 표시되지 않을 뿐이다
  }
};

interface PostFormProps {
  onCreated: (post: BoardPost) => void;
}

/**
 * @description 글 작성 폼.
 *
 * 닉네임은 seed에서 만들어지고 서버가 같은 seed로 다시 만든다 — 사용자는 리롤만 할 수 있고
 * 임의 문자열을 넣을 수 없다. 사칭·욕설 닉네임이 구조적으로 불가능해진다.
 * @param props.onCreated - 등록 성공 콜백
 */
export default function PostForm({ onCreated }: PostFormProps) {
  // 렌더 중에는 난수도 시각도 읽지 않는다 — 서버·클라이언트 값이 갈리고 React 19가 impure로 막는다.
  // 사용자가 폼에 처음 손대는 순간 둘 다 정한다. 봇 판별에도 "입력 시작 시각"이 더 정확하다
  const [seed, setSeed] = useState(0);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const openedAt = useRef<number | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const start = () => {
    if (openedAt.current !== null) return;
    openedAt.current = Date.now();
    setSeed(randomSeed());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || body.trim().length < 2) return;

    setSending(true);
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          nicknameSeed: seed,
          elapsedMs: openedAt.current ? Date.now() - openedAt.current : 0,
          website: honeypot.current?.value ?? "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "등록하지 못했습니다");
        return;
      }

      const { post, editToken } = data as CreatePostResponse;
      saveToken(post.id, editToken);
      onCreated(post);
      setBody("");
      setSeed(randomSeed());
      openedAt.current = Date.now();  // 연속 작성 — 이미 상호작용 중이라 여기서는 안전하다
      toast.success("등록했습니다");
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border-hairline bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-ink-2 text-[13px]">{deriveNickname(seed)}</span>
        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          aria-label="닉네임 다시 뽑기"
          title="다시 뽑기"
          className="text-ink-muted hover:bg-chip hover:text-ink flex h-6 w-6 cursor-pointer items-center justify-center transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <Textarea
        value={body}
        onFocus={start}
        onChange={(e) => {
          start();
          setBody(e.target.value);
        }}
        maxLength={MAX}
        rows={3}
        placeholder="개선했으면 하는 점, 추가했으면 하는 기능을 남겨주세요"
        aria-label="내용"
        className="resize-none text-[14px]"
      />

      {/* 허니팟 — 사람 눈에는 안 보이고 봇만 채운다 */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
      />

      <div className="flex items-center justify-between">
        <span className="tnum text-ink-muted text-[12px]">
          {body.length}/{MAX}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={sending || body.trim().length < 2}
          className="cursor-pointer"
        >
          {sending ? "등록 중…" : "등록"}
        </Button>
      </div>
    </form>
  );
}
