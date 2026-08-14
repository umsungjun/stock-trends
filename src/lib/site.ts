/**
 * 사이트 상수 — 브랜드 문자열과 origin 정규화를 한곳에 모은다.
 */

/**
 * path 없이 origin만 사용한다. 환경변수에 경로가 섞여 들어와도 metadataBase·canonical·OG가
 * 깨지지 않게 하기 위함이다 (lets-ko에서 검증된 패턴).
 */
export const SITE_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stock-trends.vercel.app";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://stock-trends.vercel.app";
  }
})();

export const SITE_NAME = "Stock Trends";

/**
 * 하위 페이지 title 접미사. 브랜드가 영문이라 한국어 검색에 안 걸리므로
 * 한글 서술어를 여기 붙여 검색 무게를 받는다. 예: "삼성전자 vs 애플 | 주식 비교 Stock Trends"
 */
export const SITE_SUFFIX = `주식 비교 ${SITE_NAME}`;

/**
 * 홈은 접미사를 쓰지 않는다 — 제목에 이미 "주식·비교"가 들어가 중복되고 길이만 먹는다.
 * 검색 결과 제목은 한글 30자 안팎에서 잘리므로 여기서 예산을 아낀다.
 */
export const HOME_TITLE = "국내·미국 주식 수익률 비교";

/** 화면 h1 — title과 다른 표현을 써서 커버하는 검색어를 넓힌다 */
export const HOME_HEADING = "국내 주식, 미국 주식 한눈에 수익률 비교";
export const HOME_SUBHEADING = "그때 같은 금액을 넣었다면 지금 얼마가 됐을까요";

/**
 * 검색 스니펫. 구체적인 종목·지수 이름을 앞에 두면 "내가 찾던 게 여기 있다"가 즉시 읽히고,
 * "S&P500 수익률"·"나스닥 비교" 같은 검색어도 함께 커버한다.
 */
export const SITE_DESCRIPTION =
  "삼성전자·애플·엔비디아부터 S&P500·나스닥100 ETF까지, 국내외 2,000여 종목을 한 차트에서 비교합니다. 같은 금액을 넣었다면 지금 얼마가 됐을지, 최대 낙폭과 연평균 수익률까지.";
