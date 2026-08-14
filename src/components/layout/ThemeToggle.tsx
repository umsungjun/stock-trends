"use client";

import { useMounted } from "@/hooks/useMounted";

import { useTheme } from "next-themes";

import { Monitor, Moon, Sun } from "lucide-react";

const ORDER = ["system", "light", "dark"] as const;
const LABEL = {
  system: "시스템 설정",
  light: "라이트 모드",
  dark: "다크 모드",
};

/**
 * @description 테마 순환 토글 (시스템 → 라이트 → 다크).
 *
 * 마운트 판정은 useMounted(useSyncExternalStore)로 한다. next-themes의 theme 값으로 판정하면
 * 클라이언트 첫 렌더에 이미 저장된 테마가 들어 있어 서버 결과와 갈리고,
 * 그 차이가 트리 전체의 hydration mismatch로 번진다.
 * 마운트 전에는 아이콘 자리만 비워 레이아웃이 밀리지 않게 한다.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const current = (theme ?? "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`테마 전환 (현재 ${LABEL[current]})`}
      title={LABEL[current]}
      className="text-ink-2 hover:bg-chip hover:text-ink flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm transition-colors"
    >
      {mounted ? (
        <Icon size={16} strokeWidth={2} />
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
