/**
 * 브랜드 이미지(OG 카드·파비콘)를 PNG로 굽는다.
 *
 *   node scripts/build-brand-assets.mjs
 *
 * 런타임에 생성하지 않고 정적 파일로 커밋한다 — OG 이미지는 X·카카오톡 등 크롤러가 SVG를 읽지 못하는
 * 경우가 많고, 내용이 고정이라 매 배포마다 satori를 돌릴 이유가 없다. 폰트 추적 설정도 필요 없어진다.
 *
 * 출력
 *   src/app/opengraph-image.png   1200x630  홈·게시판·개인정보 (하위 라우트가 상속)
 *   src/app/icon.png                 64x64  파비콘
 *   src/app/apple-icon.png         180x180  iOS 홈 화면
 *
 * 로고를 바꾸면 이 스크립트를 다시 돌린다. path는 src/components/layout/Logo.tsx의 심볼과 같아야 한다.
 */

// next/og는 번들러 조건부 export라 순수 Node에서 해석되지 않는다 — 컴파일된 node 진입점을 직접 쓴다
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";
import React from "react";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = new URL("../src/app/", import.meta.url);
const FONTS = new URL("../public/fonts/", import.meta.url);

const INK = "#0b0c0e";
const PAPER = "#fbfbfc";

/**
 * @description Logo.tsx의 두 줄 심볼. satori는 SVG 직접 렌더 지원이 좁아 data URI로 넘긴다.
 * @param {{size: number, color: string, strokeWidth?: number, fadedOpacity?: number}} opts
 * @returns {string} data URI
 */
const mark = ({ size, color, strokeWidth = 2, fadedOpacity = 0.32 }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
<path d="M2.5 18.5 L8 15 L13 16 L21.5 5.5" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.5 18.5 L8 19 L13 17.5 L21.5 14" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${fadedOpacity}"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const h = React.createElement;

/** 배경 위에 심볼(과 선택적으로 워드마크)을 가운데 놓는 공통 레이아웃 */
const card = ({ background, markSrc, markSize, gap = 0, children = [] }) =>
  h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap,
        background,
        fontFamily: "Pretendard",
        color: INK,
      },
    },
    h("img", { src: markSrc, width: markSize, height: markSize, alt: "" }),
    ...children
  );

const render = async (element, size, fonts, file) => {
  const res = new ImageResponse(element, { ...size, fonts });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(file, OUT), buf);
  console.log(`  ${file.padEnd(22)} ${size.width}x${size.height}  ${(buf.length / 1024).toFixed(1)}KB`);
};

const bold = await readFile(path.join(FONTS.pathname, "Pretendard-Bold.otf"));
const fonts = [{ name: "Pretendard", data: bold, weight: 700, style: "normal" }];

console.log("브랜드 이미지 생성\n");

// OG — 밝은 배경에 검은 심볼과 워드마크
await render(
  card({
    background: PAPER,
    markSrc: mark({ size: 150, color: INK }),
    markSize: 150,
    gap: 36,
    children: [
      h("div", { style: { fontSize: 76, fontWeight: 700, letterSpacing: "-0.02em" } }, "Stock Trends"),
    ],
  }),
  { width: 1200, height: 630 },
  fonts,
  "opengraph-image.png"
);

// 파비콘 — 탭 배경이 밝든 어둡든 보이도록 반전해서 어두운 칩 위에 얹는다.
// 16~32px로 줄어들면 선이 사라지므로 두께와 뒤쪽 선 불투명도를 올린다
await render(
  card({
    background: INK,
    markSrc: mark({ size: 42, color: PAPER, strokeWidth: 2.8, fadedOpacity: 0.5 }),
    markSize: 42,
  }),
  { width: 64, height: 64 },
  fonts,
  "icon.png"
);

// iOS는 자체 라운드 마스크를 씌우므로 모서리를 깎지 않고 꽉 채운다
await render(
  card({
    background: INK,
    markSrc: mark({ size: 112, color: PAPER, strokeWidth: 2.4, fadedOpacity: 0.45 }),
    markSize: 112,
  }),
  { width: 180, height: 180 },
  fonts,
  "apple-icon.png"
);

console.log("\n완료");
