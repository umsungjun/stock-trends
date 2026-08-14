import Link from "next/link";

/**
 * @description 전역 푸터 — 데이터 출처와 한계를 명시한다.
 *
 * 금융 정보는 검색엔진이 더 엄격하게 평가하는 영역이라, 출처·기준·한계를 숨기지 않는 것이
 * 사용자 신뢰와 SEO를 동시에 얻는 몇 안 되는 항목이다. 배당 미반영을 특히 감추지 않는다.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-hairline">
      <div className="mx-auto max-w-[1080px] px-4 py-8 text-[12px] leading-relaxed text-ink-muted">
        <p>
          시세는 <b className="font-semibold text-ink-2">네이버 금융</b>{" "}
          기준이며 주간 종가로 집계합니다. 가격은 수정주가로 액면분할·증자가
          소급 보정되어 있지만{" "}
          <b className="font-semibold text-ink-2">배당은 반영되지 않은</b> 주가
          수익률입니다 — 배당까지 넣으면 실제 성과는 이보다 높습니다.
        </p>
        <p className="mt-2">
          미국 종목은 각 시점의 원/달러 매매기준율로 환산해 원화로 표시합니다.
          세금·거래비용은 반영하지 않습니다.
        </p>
        <p className="mt-2">
          이 사이트는 과거 데이터를 비교해 보여줄 뿐{" "}
          <b className="font-semibold text-ink-2">투자를 권유하지 않습니다.</b>{" "}
          과거 수익률은 미래를 보장하지 않습니다.
        </p>

        <div className="mt-5 flex items-center gap-3 border-t border-hairline pt-4">
          <span>© {new Date().getFullYear()} Stock Trends</span>
          <Link href="/privacy" className="hover:text-ink-2">
            개인정보처리방침
          </Link>
          <Link href="/board" className="hover:text-ink-2">
            건의사항
          </Link>
        </div>
      </div>
    </footer>
  );
}
