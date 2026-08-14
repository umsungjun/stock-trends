import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트.
 *
 * 브라우저용 클라이언트은 두지 않는다 — RLS를 전면 차단하고 모든 접근을 서버 라우트로 통과시키기
 * 때문에 anon 키로 할 수 있는 일이 없다. IP 해시 레이트리밋·토큰 검증이 서버에서만 가능하고,
 * 응답에 캐시를 걸어 DB 읽기를 줄이려는 목적도 있다.
 */

/** @description 게시판 기능을 켤 수 있는 상태인가. 환경변수가 없으면 화면이 "준비 중"으로 뜬다 */
export const isBoardEnabled = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

/**
 * @description service_role 클라이언트를 만든다. RLS를 우회하므로 서버에서만 써야 한다.
 * @throws 환경변수가 없으면
 */
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
