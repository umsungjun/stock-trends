"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * @description next-themes 래퍼. attribute="class"를 쓰는 이유는 shadcn 생태계 전체가 .dark 클래스를
 * 가정하기 때문이다 (프로토타입의 data-theme 방식에서 갈아탄 지점).
 * globals.css의 @custom-variant dark 선언이 함께 있어야 Tailwind v4에서 실제로 동작한다.
 * @param props.children - 앱 트리
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
