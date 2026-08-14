import type { MetadataRoute } from "next";

import { getMeta, getPopularSlugs } from "@/lib/market/registry.server";
import { SITE_URL } from "@/lib/site";

/** 사이트맵 하나당 URL 상한. 규격상 50,000이지만 파일 크기를 위해 낮게 잡는다 */
const CHUNK = 5_000;

/**
 * @description 사이트맵을 청크로 나눈다. generateStaticParams와 **같은 파일**(popular-slugs.json)을
 * 읽으므로 사전 생성 목록과 사이트맵이 어긋나는 사고가 구조적으로 발생하지 않는다.
 */
export async function generateSitemaps() {
  const slugs = await getPopularSlugs();
  const count = Math.max(1, Math.ceil(slugs.length / CHUNK));
  return Array.from({ length: count }, (_, id) => ({ id }));
}

/**
 * @description 청크별 사이트맵.
 * @param props.id - 청크 번호. **Next 16부터 Promise다** (page params와 같은 변화).
 *   await하지 않으면 산술이 NaN이 되어 빈 사이트맵이 조용히 생성된다.
 */
export default async function sitemap({
  id,
}: {
  id: Promise<number>;
}): Promise<MetadataRoute.Sitemap> {
  const chunk = Number(await id) || 0;
  const [slugs, meta] = await Promise.all([getPopularSlugs(), getMeta()]);

  // 데이터 갱신일을 lastModified로 쓴다 — 주간 갱신 주기가 크롤러에 그대로 전달된다
  const lastModified = new Date(
    `${meta.asOfDate.slice(0, 4)}-${meta.asOfDate.slice(4, 6)}-${meta.asOfDate.slice(6, 8)}`
  );

  const entries: MetadataRoute.Sitemap = slugs
    .slice(chunk * CHUNK, (chunk + 1) * CHUNK)
    .map((slug) => ({
      url: `${SITE_URL}/${encodeURIComponent(slug)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      // 단일 종목 페이지가 롱테일 검색어와 1:1로 대응해 유입이 크다
      priority: slug.includes("-vs-") ? 0.6 : 0.8,
    }));

  if (chunk === 0) {
    entries.unshift(
      { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
      { url: `${SITE_URL}/board`, changeFrequency: "daily", priority: 0.5 }
    );
  }

  return entries;
}
