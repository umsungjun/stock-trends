import Link from "next/link";

import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

/**
 * @description 전역 헤더 — 로고, 게시판 링크, 테마 토글.
 * 서버 컴포넌트다. 인터랙티브한 것은 ThemeToggle 하나뿐이라 그것만 클라이언트로 내려간다.
 */
export default function Header() {
  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-ink transition-opacity hover:opacity-70"
          aria-label="Stock Trends 홈"
        >
          <Logo />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/board"
            className="rounded-sm px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-chip hover:text-ink"
          >
            건의사항
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
