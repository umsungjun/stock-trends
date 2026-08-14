import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

/**
 * 페이지 디렉터리 간 교차 import 금지.
 *
 * compare/ 와 board/ 는 각자의 페이지에만 종속된다. 한쪽이 다른 쪽을 import하려는 순간
 * 그 컴포넌트는 공용이 된 것이므로 common/ 으로 승격해야 한다.
 * 규칙이 사람 기억에만 있으면 반년 뒤에 무너지므로 도구로 강제한다.
 */
const pageScopes = ["compare", "board"];
const crossImportRules = pageScopes.map((scope) => ({
  files: [`src/components/${scope}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: pageScopes
          .filter((other) => other !== scope)
          .map((other) => ({
            group: [`@/components/${other}/*`],
            message: `페이지 종속 컴포넌트끼리는 import할 수 없습니다. 양쪽에서 쓰이면 @/components/common/ 으로 옮기세요.`,
          })),
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...crossImportRules,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**", // 데이터 파이프라인은 .mjs — Next 타입 규칙 대상이 아니다
    "public/data/**",
    "src/components/ui/**", // shadcn CLI 생성 구역 — 수동 수정하지 않는다
  ]),
]);

export default eslintConfig;
