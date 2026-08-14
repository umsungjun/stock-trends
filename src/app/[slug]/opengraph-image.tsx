import { ImageResponse } from "next/og";

import { buildOgChartSvg, toDataUri } from "@/lib/chart/og-svg";
import { assignSlots, slotHex } from "@/lib/chart/palette";
import { pct, won, ymd } from "@/lib/format";
import { compute } from "@/lib/market/compute";
import { DEFAULT_AMOUNT, DEFAULT_PERIOD } from "@/lib/market/constants";
import {
  getMeta,
  getPopularSlugs,
  getSeriesMany,
  getSlugResolver,
  getTickerMap,
} from "@/lib/market/registry.server";
import { parseSlug } from "@/lib/market/slug";
import { SITE_NAME } from "@/lib/site";

import { readFile } from "node:fs/promises";
import path from "node:path";

// satori는 Edge에서 폰트 파일을 읽지 못한다
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "종목 비교 결과";

/** 사전 생성분은 페이지와 함께 이미지까지 빌드 타임에 구워진다 */
export async function generateStaticParams() {
  const slugs = await getPopularSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * 폰트를 모듈 레벨에 메모한다.
 * 수천 장을 굽는데 이미지마다 파일을 다시 읽으면(혹은 원격에서 받으면) 빌드가 기어간다.
 */
let fontCache: { regular: Buffer; bold: Buffer } | null = null;
const loadFonts = async () => {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "Pretendard-Regular.otf")),
    readFile(path.join(dir, "Pretendard-Bold.otf")),
  ]);
  fontCache = { regular, bold };
  return fontCache;
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [resolver, meta, tickerMap, fonts] = await Promise.all([
    getSlugResolver(),
    getMeta(),
    getTickerMap(),
    loadFonts(),
  ]);

  const parsed = parseSlug(decodeURIComponent(slug), resolver);
  const tickers = parsed.codes
    .map((c) => tickerMap.get(c))
    .filter((t) => t !== undefined);
  const series = await getSeriesMany(
    tickers.map((t) => ({ code: t.code, market: t.market }))
  );
  const { range, rows } = compute(
    series,
    DEFAULT_PERIOD,
    DEFAULT_AMOUNT,
    meta.weeks.length,
    meta.fx
  );

  const slots = assignSlots(tickers.map((t) => t.code));
  const sorted = [...rows].sort((a, b) => b.final - a.final);
  const nameOf = (code: string) =>
    tickers.find((t) => t.code === code)?.name ?? code;

  const chart = rows.length
    ? toDataUri(buildOgChartSvg({ rows, slots, amount: DEFAULT_AMOUNT }))
    : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fbfbfc",
        padding: "48px 56px",
        fontFamily: "Pretendard",
        color: "#0b0c0e",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 20, color: "#868a92" }}>주식 비교</div>
      </div>

      <div style={{ fontSize: 46, fontWeight: 700, marginTop: 18 }}>
        {tickers.map((t) => t.name).join("  vs  ")}
      </div>
      <div style={{ fontSize: 22, color: "#4e5158", marginTop: 8 }}>
        {rows.length
          ? `${ymd(meta.weeks[range.start])}에 ${won(DEFAULT_AMOUNT)}원을 넣었다면`
          : "종목을 비교해 보세요"}
      </div>

      {/* 숫자가 커야 공유 클릭이 난다 */}
      <div style={{ display: "flex", gap: 40, marginTop: 22 }}>
        {sorted.slice(0, 3).map((r) => (
          <div
            key={r.code}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  background: slotHex(slots[r.code] ?? 0),
                }}
              />
              <div style={{ fontSize: 20, color: "#4e5158" }}>
                {nameOf(r.code)}
              </div>
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, marginTop: 2 }}>
              {`${won(r.final)}원`}
            </div>
            <div style={{ fontSize: 19, color: "#868a92" }}>
              {`연 ${pct(r.cagr)} · 최대 낙폭 ${pct(r.mdd)}`}
            </div>
          </div>
        ))}
      </div>

      {chart && (
        <div style={{ display: "flex", marginTop: "auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chart} width={1000} height={200} alt="" />
        </div>
      )}

      <div style={{ fontSize: 17, color: "#868a92", marginTop: 14 }}>
        {`네이버 금융 · ${ymd(meta.asOfDate)} 기준 · 배당 미반영`}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Pretendard",
          data: fonts.regular,
          weight: 400,
          style: "normal",
        },
        { name: "Pretendard", data: fonts.bold, weight: 700, style: "normal" },
      ],
    }
  );
}
