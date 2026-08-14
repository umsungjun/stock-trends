"use client";

import { useState } from "react";

import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareBarProps {
  /** 공유할 경로 ("/삼성전자-vs-애플") */
  path: string;
  /** 표시용 호스트 */
  host: string;
}

/**
 * @description 공유 URL 표시와 복사.
 *
 * 복사 완료는 토스트로 알린다 — 프로토타입은 버튼 텍스트를 잠깐 바꿨는데,
 * 버튼을 보고 있지 않으면 놓친다.
 * @param props.path - 공유 경로
 * @param props.host - 표시용 호스트
 */
export default function ShareBar({ path, host }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const display = `${host}${path}`;

  const copy = async () => {
    try {
      const absolute =
        typeof window !== "undefined"
          ? `${window.location.origin}${path}`
          : display;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success("공유 링크를 복사했습니다");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("복사에 실패했습니다. 주소창에서 직접 복사해 주세요");
    }
  };

  return (
    <div className="border-hairline bg-surface flex items-center gap-2 border px-3 py-2">
      <Link2 size={14} className="text-ink-muted shrink-0" />
      <span className="text-ink-2 truncate text-[12.5px]">{display}</span>
      <button
        type="button"
        onClick={copy}
        className="border-hairline hover:bg-chip ml-auto flex shrink-0 cursor-pointer items-center gap-1 border px-2.5 py-1 text-[12px] transition-colors"
      >
        {copied ? <Check size={12} /> : null}
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
