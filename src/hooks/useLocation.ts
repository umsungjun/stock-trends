"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  // replaceState는 popstate를 발생시키지 않으므로, URL을 미러링해도 되먹임이 없다
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};

/**
 * @description 현재 URL의 쿼리스트링을 SSR 안전하게 읽는다.
 *
 * 서버 스냅샷은 항상 빈 문자열이다 — 정적 생성 페이지는 쿼리를 모른 채 기본값으로 렌더되고,
 * 하이드레이션 직후 실제 쿼리로 한 번 더 그려진다. useEffect + setState 조합과 달리
 * hydration 불일치가 없고 React 19의 set-state-in-effect 규칙에도 걸리지 않는다.
 *
 * 서버 컴포넌트에서 searchParams를 읽지 않는 이유는 따로 있다 — await하는 순간
 * 페이지가 동적 렌더링으로 바뀌어 generateStaticParams가 통째로 무의미해진다.
 * @returns "?p=5y&a=50000000" 형태 (없으면 "")
 */
export function useLocationSearch(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => ""
  );
}

/**
 * @description 현재 경로를 SSR 안전하게 읽는다. 서버 컴포넌트가 알 수 없는 정보를
 * 클라이언트에서 채울 때 쓴다 (not-found 페이지가 시도된 종목명을 보여주는 용도).
 * @returns "/삼성전자-vs-애플" (서버에서는 "")
 */
export function useLocationPathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => ""
  );
}
