import Link from "next/link";

interface PopularComparisonsProps {
  /** 표시할 조합 — [{ label, slug }] */
  items: { label: string; slug: string }[];
  title?: string;
}

/**
 * @description 인기 비교 조합 링크 그리드.
 *
 * 크롤러가 롱테일 페이지로 타고 들어가는 경로다. 서버 컴포넌트라 JS 번들에 들어가지 않으면서
 * 초기 HTML에는 그대로 실린다. 사이트맵만으로는 내부 링크 신호가 없다.
 * @param props.items - 링크 목록
 * @param props.title - 섹션 제목
 */
export default function PopularComparisons({
  items,
  title = "많이 비교하는 조합",
}: PopularComparisonsProps) {
  if (!items.length) return null;

  return (
    <nav className="mt-8" aria-label={title}>
      <h2 className="text-ink-2 text-[13px] font-medium">{title}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it.slug}>
            <Link
              href={`/${it.slug}`}
              className="border-hairline text-ink-2 hover:bg-chip hover:text-ink block border px-2.5 py-1.5 text-[12.5px] transition-colors"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
