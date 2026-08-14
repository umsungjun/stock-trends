import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * public/data/{code}.json 을 서버에서 fs로 읽는데, 경로가 동적이라 Next의 정적 분석이 못 잡는다.
   * 이게 없으면 사전 생성분은 빌드 타임에 읽으니 정상 동작하고 **배포 후 새 조합을 처음 열 때만**
   * 서버리스 함수 안에 파일이 없어 500이 난다 — 발견이 가장 늦는 종류의 버그다.
   *
   * 서버에서 public/data를 읽는 라우트를 추가하면 여기에도 등록할 것.
   */
  outputFileTracingIncludes: {
    "/": ["./public/data/**"],
    "/[slug]": ["./public/data/**"],
    "/[slug]/opengraph-image": ["./public/data/**", "./public/fonts/**"],
    "/sitemap/[__metadata_id__]": ["./public/data/**"],
    "/robots.txt": ["./public/data/**"],
  },
};

export default nextConfig;
