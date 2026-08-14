"use client";

import { useTheme } from "next-themes";

import { Toaster } from "sonner";

/**
 * @description sonner 토스트 전역 마운트 래퍼 — 루트 레이아웃에서 한 번만 렌더링하고,
 * 각 클라이언트 컴포넌트에서 toast() 호출로 사용한다.
 *
 * 토스트는 "사라져도 되는 알림"에만 쓴다. 구간 축소 안내처럼 화면이 그 상태인 동안
 * 계속 보여야 하는 것은 인라인 notice로 둔다 — 3초 뒤 사라지면 나중에 화면을 본 사람이
 * 왜 10년을 눌렀는데 6년만 나오는지 알 방법이 없어진다.
 */
export default function AppToaster() {
  const { resolvedTheme } = useTheme();

  // richColors: 성공·실패 상태색 활성화. 모바일 비중을 고려해 하단 중앙 배치
  return (
    <Toaster
      position="bottom-center"
      richColors
      duration={3000}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
