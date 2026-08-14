interface LogoProps {
  /** 워드마크를 숨기고 심볼만 렌더 (파비콘·OG·좁은 화면용) */
  symbolOnly?: boolean;
  /** 심볼 한 변의 px 크기 */
  size?: number;
  className?: string;
}

/**
 * @description Stock Trends 로고 — 비교 차트를 형상화한 두 줄 라인 심볼 + 워드마크.
 * 이미지가 아니라 인라인 SVG라 요청이 없고, currentColor를 쓰므로 다크모드가 자동으로 따라온다.
 * @param props.symbolOnly - true면 심볼만 (기본 false)
 * @param props.size - 심볼 크기 px (기본 22)
 * @param props.className - 래퍼 클래스
 */
export default function Logo({
  symbolOnly = false,
  size = 22,
  className,
}: LogoProps) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        role="presentation"
      >
        {/* 갈라지는 두 선이 "같은 시점에 출발한 두 종목"을 나타낸다 */}
        <path
          d="M2.5 18.5 L8 15 L13 16 L21.5 5.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2.5 18.5 L8 19 L13 17.5 L21.5 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.32"
        />
      </svg>
      {!symbolOnly && (
        <span
          style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: 16 }}
        >
          Stock Trends
        </span>
      )}
      <span className="sr-only">주식 비교</span>
    </span>
  );
}
