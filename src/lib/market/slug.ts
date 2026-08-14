/**
 * 슬러그 파싱·생성 — 공유 URL의 정본을 다룬다.
 *
 * 정규화 규칙은 scripts/universe/rules.mjs와 **같아야 한다.** 다만 런타임에서는
 * 이름으로부터 슬러그를 만들지 않는다 — tickers.json에 구워둔 canonical 값을 조회할 뿐이라
 * 파싱(슬러그→코드)과 역파싱(코드→슬러그)이 항상 대칭이다.
 * 여기의 normalize는 사용자가 친 입력을 canonical 형태로 맞추는 데만 쓴다.
 */

export const SEPARATOR = "-vs-";
export const MAX_PICKS = 5;

/**
 * 루트 라우트로 예약된 슬러그. 새 루트 페이지를 추가하면 여기와
 * scripts/universe/rules.mjs의 RESERVED_SLUGS 양쪽에 넣어야 한다.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "board",
  "data",
  "privacy",
  "about",
  "terms",
  "sitemap",
  "robots",
  "_next",
  "favicon.ico",
  "opengraph-image",
  "icon",
  "manifest",
]);

/**
 * @description 입력 문자열을 슬러그 형태로 정규화한다.
 *
 * NFC 정규화가 먼저다 — macOS IME나 파일명을 거친 링크가 NFD로 들어오면
 * "삼성전자"(NFC)와 "삼성전자"(NFD)가 다른 문자열이 되어 캐시가 갈라진다.
 * @param input - 원본 문자열
 * @returns 소문자 슬러그
 */
export const normalizeSlug = (input: string): string =>
  input
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[&./()·・,'"+~\-_[\]{}!?:;*#@$%^=|\\<>]/g, "")
    .toLowerCase();

export interface SlugResolver {
  /** canonical 슬러그 → 코드 */
  bySlug: Map<string, string>;
  /** 별칭(코드·티커·영문명) → 코드 */
  byAlias: Map<string, string>;
  /** 코드 → canonical 슬러그 */
  slugOf: Map<string, string>;
}

export interface ParsedSlug {
  /** 해석된 종목 코드 (입력 순서 유지) */
  codes: string[];
  /** 해석 실패한 토큰 */
  unresolved: string[];
  /** 정규화·별칭 해소를 마친 정본 경로 */
  canonical: string;
  /** canonical과 입력이 다르면 308로 보내야 한다 */
  needsRedirect: boolean;
}

/**
 * @description URL 슬러그를 종목 코드로 해석한다.
 *
 * 별칭으로 들어온 경우 canonical과 달라지므로 호출부가 308 리다이렉트를 해야 한다.
 * 링크 자산을 한 URL로 모으는 것이 목적이다.
 * @param raw - 디코딩된 경로 세그먼트
 * @param resolver - tickers.json·aliases.json으로 만든 조회 맵
 * @returns 해석 결과
 */
export const parseSlug = (raw: string, resolver: SlugResolver): ParsedSlug => {
  const decoded = raw.normalize("NFC");
  const tokens = decoded.split(SEPARATOR).filter(Boolean);

  const codes: string[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (codes.length >= MAX_PICKS) break; // 6개 이상은 잘라내고 308로 보낸다
    const key = normalizeSlug(token);
    const code = resolver.bySlug.get(key) ?? resolver.byAlias.get(key);
    if (!code) {
      unresolved.push(token);
      continue;
    }
    if (seen.has(code)) continue; // 같은 종목 중복 선택 제거
    seen.add(code);
    codes.push(code);
  }

  const canonical = buildSlug(codes, resolver);
  return {
    codes,
    unresolved,
    canonical,
    // 판정 기준은 정규화된 값이 아니라 **사용자가 실제로 친 raw**다.
    // decoded와 비교하면 NFD로 들어온 URL이 리다이렉트 없이 그대로 색인된다
    needsRedirect: codes.length > 0 && canonical !== raw,
  };
};

/**
 * @description 종목 코드 배열을 canonical 슬러그로 되돌린다.
 * 이름에서 계산하지 않고 구워둔 값을 조회하므로 파싱과 항상 대칭이다.
 * @param codes - 종목 코드
 * @param resolver - 조회 맵
 */
export const buildSlug = (codes: string[], resolver: SlugResolver): string =>
  codes
    .map((c) => resolver.slugOf.get(c))
    .filter((s): s is string => Boolean(s))
    .join(SEPARATOR);

/** @description 예약어와 충돌하는 경로인지 — 슬러그 파서가 먼저 거부해야 한다 */
export const isReserved = (segment: string): boolean =>
  RESERVED_SLUGS.has(segment.toLowerCase());
