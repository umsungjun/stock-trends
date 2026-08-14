import type { MetadataRoute } from "next";

import { getPopularSlugs } from "@/lib/market/registry.server";
import { SITE_URL } from "@/lib/site";

const CHUNK = 5_000;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const slugs = await getPopularSlugs();
  const count = Math.max(1, Math.ceil(slugs.length / CHUNK));

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 쿼리 변형(?p=5y)은 canonical로 모으므로 크롤 예산을 쓸 이유가 없다
      disallow: ["/api/"],
    },
    // generateSitemaps가 만드는 청크 수와 일치시킨다
    sitemap: Array.from(
      { length: count },
      (_, i) => `${SITE_URL}/sitemap/${i}.xml`
    ),
    host: SITE_URL,
  };
}
