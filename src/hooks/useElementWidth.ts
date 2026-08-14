"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * @description 요소의 실제 폭을 추적한다.
 *
 * window resize 대신 ResizeObserver를 쓰는 이유: 광고 슬롯이 늦게 로드되며 컨테이너 폭을
 * 바꿀 수 있는데 resize 이벤트는 그걸 못 잡는다.
 *
 * 초기값을 서버·클라이언트가 동일하게 쓰므로 hydration이 어긋나지 않는다.
 * 실제 폭은 페인트 전(useLayoutEffect)에 반영돼 레이아웃 점프가 보이지 않는다.
 * @param initial - 측정 전 사용할 폭
 */
export function useElementWidth(initial = 900) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = (w: number) => {
      const next = Math.round(w);
      if (next > 0) setWidth((prev) => (prev === next ? prev : next));
    };

    apply(el.getBoundingClientRect().width);

    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      // rAF로 감싸 "ResizeObserver loop limit exceeded" 경고를 피한다
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => apply(entries[0].contentRect.width));
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return { ref, width };
}
