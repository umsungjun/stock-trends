"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { MAX_PICKS } from "@/lib/chart/palette";
import { matchTickers } from "@/lib/market/search";
import { loadTickers } from "@/lib/market/series.client";
import type { Ticker } from "@/types/market";

import { Search } from "lucide-react";
import { toast } from "sonner";

interface TickerSearchProps {
  picked: string[];
  onPick: (t: Ticker) => void;
  onRequest: (query: string) => void;
}

/**
 * @description 종목 검색 — 초성·이름·코드·영문명.
 *
 * 목록(48KB)은 **첫 포커스에 지연 로드**한다. 첫 화면에서는 필요 없으므로
 * 초기 전송량에 넣지 않는다.
 *
 * cmdk의 내장 필터를 쓰지 않는 이유: 초성 검색을 못 한다. 우리가 필터링한 결과만 넘긴다.
 * 대신 방향키·Enter·roving tabindex 같은 조합키 처리를 그대로 얻는다.
 * @param props.picked - 이미 선택된 코드
 * @param props.onPick - 종목 선택 콜백
 * @param props.onRequest - 없는 종목 추가 요청 콜백
 */
export default function TickerSearch({
  picked,
  onPick,
  onRequest,
}: TickerSearchProps) {
  const [query, setQuery] = useState("");
  const [tickers, setTickers] = useState<Ticker[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const ensureLoaded = () => {
    if (tickers || loading) return;
    setLoading(true);
    loadTickers()
      .then(setTickers)
      .catch(() => toast.error("종목 목록을 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  };

  const full = picked.length >= MAX_PICKS;
  const hits = tickers ? matchTickers(tickers, query) : [];
  const showPanel = open && query.trim().length > 0;

  const choose = (t: Ticker) => {
    if (picked.includes(t.code) || full) return;
    onPick(t);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="border-hairline bg-field focus-within:border-focus flex items-center gap-2 border px-3 transition-colors">
        <Search size={15} className="text-ink-muted shrink-0" />
        <input
          type="text"
          value={query}
          autoComplete="off"
          spellCheck={false}
          placeholder="종목명 · 코드 · 초성으로 검색 (예: ㅅㅅㅈㅈ, AAPL)"
          aria-label="종목 검색"
          // 감싼 div가 focus-within으로 테두리를 바꾼다 — outline-none은 브라우저 기본 링, data-focus-ring은 전역 링을 뺀다
          data-focus-ring="none"
          className="text-ink placeholder:text-ink-muted h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          onFocus={() => {
            ensureLoaded();
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
            } else if (e.key === "Enter" && hits.length) {
              choose(hits[0]);
            }
          }}
        />
      </div>

      {showPanel && (
        <div className="border-hairline bg-field absolute top-[calc(100%+4px)] right-0 left-0 z-20 max-h-[320px] overflow-y-auto border shadow-lg">
          {loading && (
            <p className="text-ink-muted px-3 py-3 text-[13px]">
              종목 목록을 불러오는 중…
            </p>
          )}

          {!loading && hits.length === 0 && (
            <div className="px-3 py-3">
              <p className="text-ink-muted text-[13px]">
                “{query}” 와 맞는 종목이 없어요.
              </p>
              <button
                type="button"
                onClick={() => {
                  onRequest(query.trim());
                  setOpen(false);
                }}
                className="text-focus mt-1.5 cursor-pointer text-[13px] underline underline-offset-2"
              >
                이 종목 추가 요청하기
              </button>
            </div>
          )}

          {!loading &&
            hits.map((t) => {
              const already = picked.includes(t.code);
              const disabled = already || full;
              return (
                <button
                  key={t.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => choose(t)}
                  className="hover:bg-chip flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="tnum text-ink-muted shrink-0 text-[11.5px]">
                    {t.code}
                  </span>
                  <Badge
                    variant="secondary"
                    className="ml-auto shrink-0 text-[10.5px]"
                  >
                    {already ? "선택됨" : full ? "자리 없음" : t.kind}
                  </Badge>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
