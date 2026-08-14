import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * 순수 모듈만 테스트한다 — compute·slug·geometry·palette·search.
 * 금융 숫자가 틀리면 신뢰가 회복되지 않으므로 이 넷은 회귀 테스트로 못 박는다.
 * (컴포넌트 테스트는 도입하지 않는다. 빌드 타입 체크로 충분한 범위다)
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
