"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * @description 하이드레이션이 끝났는지. 서버와 클라이언트 첫 렌더에서 모두 false를 주고
 * 하이드레이션 직후 true로 바뀐다.
 *
 * `theme !== undefined` 같은 값 기반 판정은 안 된다 — next-themes는 클라이언트 첫 렌더에서
 * 이미 저장된 테마를 갖고 있어 서버 결과와 갈리고, 그게 트리 전체의 hydration mismatch가 된다.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
