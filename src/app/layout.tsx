import "./globals.css";

import type { Metadata } from "next";

import AppToaster from "@/components/common/AppToaster";
import ThemeProvider from "@/components/common/ThemeProvider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import {
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SUFFIX,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  // 상대 경로 alternates·OG가 절대 URL로 변환되도록 설정
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${HOME_TITLE} | ${SITE_NAME}`,
    // 검색 결과 제목은 한글 30자 안팎에서 잘린다. %s에는 종목명 조합만 넣고
    // 수익률 숫자는 description으로 보낸다 — 숫자를 제목에 넣으면 브랜드가 잘려나간다
    template: `%s | ${SITE_SUFFIX}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "주식 비교",
    "종목 비교",
    "수익률 비교",
    "백테스트",
    "ETF 비교",
    "미국주식",
    "S&P500",
    "나스닥100",
    "CAGR",
    "MDD",
  ],
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: `${HOME_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${HOME_TITLE} | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning — next-themes가 하이드레이션 전에 클래스를 주입한다
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
