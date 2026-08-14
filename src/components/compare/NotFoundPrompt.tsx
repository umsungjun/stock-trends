"use client";

import Link from "next/link";

import { useLocationPathname } from "@/hooks/useLocation";
import { SEPARATOR } from "@/lib/market/slug";

import { toast } from "sonner";

/**
 * @description 없는 슬러그로 들어온 방문자에게 시도한 종목명을 보여주고 추가 요청을 유도한다.
 *
 * not-found.tsx는 서버 컴포넌트라 어떤 경로로 들어왔는지 알 수 없다. 여기서
 * window.location.pathname을 읽어 채운다. 404를 이탈이 아니라 **수요 데이터 수집 지점**으로 만든다.
 */
export default function NotFoundPrompt() {
  // useSyncExternalStore로 읽으면 hydration이 어긋나지 않고 effect에서 setState할 일도 없다
  const pathname = useLocationPathname();
  const attempted = pathname
    ? decodeURIComponent(pathname.replace(/^\//, ""))
        .split(SEPARATOR)
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (!attempted.length) {
    return (
      <Link
        href="/"
        className="text-focus text-[13.5px] underline underline-offset-2"
      >
        비교 도구로 돌아가기
      </Link>
    );
  }

  return (
    <div className="border-hairline bg-surface mt-5 border px-4 py-4">
      <p className="text-[13.5px]">
        <b className="font-semibold">
          {attempted.map((a) => `“${a}”`).join(", ")}
        </b>{" "}
        <span className="text-ink-2">와 맞는 종목을 찾지 못했습니다.</span>
      </p>
      <p className="text-ink-muted mt-1 text-[12.5px]">
        이름·종목코드·영문명·티커로 찾을 수 있습니다. 아직 없는 종목이라면
        추가를 요청해 주세요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/"
          className="border-hairline hover:bg-chip border px-3 py-1.5 text-[13px] transition-colors"
        >
          검색해서 비교하기
        </Link>
        <button
          type="button"
          onClick={() =>
            toast.info(`"${attempted[0]}" 추가 요청은 곧 지원됩니다`, {
              description: "게시판 기능과 함께 열립니다.",
            })
          }
          className="border-hairline hover:bg-chip cursor-pointer border px-3 py-1.5 text-[13px] transition-colors"
        >
          이 종목 추가 요청하기
        </button>
      </div>
    </div>
  );
}
