import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * 테스트는 tests/ 아래에 모은다 — 소스 트리에 섞이지 않게.
 *   tests/lib          순수 모듈 단위 테스트
 *   tests/integration  실제 산출물(public/data)로 도는 검증
 *   tests/scripts      데이터 파이프라인(.mjs) — node --test로 별도 실행
 *
 * 순수 모듈만 테스트한다 — compute·slug·geometry·palette·search.
 * 금융 숫자가 틀리면 신뢰가 회복되지 않으므로 이 넷은 회귀 테스트로 못 박는다.
 * (컴포넌트 테스트는 도입하지 않는다. 빌드 타입 체크로 충분한 범위다)
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
