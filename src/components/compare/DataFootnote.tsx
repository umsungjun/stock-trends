import { ymd } from "@/lib/format";
import type { MarketMeta } from "@/types/market";

interface DataFootnoteProps {
  meta: MarketMeta;
}

/**
 * @description 데이터 출처·기준일·한계 고지.
 *
 * 금융 정보는 검색엔진이 더 엄격하게 평가하는 영역이라, 한계를 숨기지 않는 것이
 * 사용자 신뢰와 SEO를 동시에 얻는다. 배당 미반영을 특히 감추지 않는다.
 * @param props.meta - meta.json
 */
export default function DataFootnote({ meta }: DataFootnoteProps) {
  return (
    <p className="text-ink-muted mt-6 text-[12px] leading-relaxed">
      기준일 <b className="text-ink-2 font-medium">{ymd(meta.asOfDate)}</b> (
      {meta.asOfWeek}, 주간 갱신) · 시세 네이버 금융 · 환율{" "}
      {meta.sources.fx === "ecos" ? "한국은행" : "네이버"} 매매기준율
      <br />
      수정주가 기준으로 액면분할·증자는 보정되어 있으나{" "}
      <b className="text-ink-2 font-medium">배당은 반영되지 않았습니다.</b> 미국
      종목은 각 시점의 환율로 환산했습니다.
    </p>
  );
}
