import { ImageResponse } from "next/og";

import { toDataUri } from "@/lib/chart/og-svg";
import { SITE_NAME } from "@/lib/site";

import { readFile } from "node:fs/promises";
import path from "node:path";

// satori는 Edge에서 폰트 파일을 읽지 못한다
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

/**
 * 홈·게시판·개인정보 페이지의 공용 OG 카드.
 *
 * app 세그먼트 최상단에 두면 자체 opengraph-image가 없는 하위 라우트가 이걸 상속한다.
 * 비교 페이지는 자기 것(차트 카드)이 있으므로 영향을 받지 않는다.
 *
 * layout이 twitter.card를 summary_large_image로 선언하는데 이미지가 없으면 카드가 아예 뜨지 않는다.
 */

/** Logo 컴포넌트의 심볼과 같은 path. satori는 SVG 직접 렌더 지원이 좁아 data URI로 넘긴다 */
const LOGO =
  toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none">
<path d="M2.5 18.5 L8 15 L13 16 L21.5 5.5" stroke="#0b0c0e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.5 18.5 L8 19 L13 17.5 L21.5 14" stroke="#0b0c0e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.32"/>
</svg>`);

export default async function Image() {
  const bold = await readFile(
    path.join(process.cwd(), "public", "fonts", "Pretendard-Bold.otf")
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        background: "#fbfbfc",
        fontFamily: "Pretendard",
        color: "#0b0c0e",
      }}
    >
      <img src={LOGO} width={150} height={150} alt="" />
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: "-0.02em" }}>
        {SITE_NAME}
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Pretendard", data: bold, weight: 700, style: "normal" }],
    }
  );
}
