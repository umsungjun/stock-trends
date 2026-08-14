/**
 * 유니버스 선정·분류 규칙 + 슬러그 정규화.
 *
 * 슬러그를 여기서 확정해 tickers.json에 굽는다. 런타임에 다시 계산하지 않으므로
 * 파싱(슬러그→종목)과 역파싱(종목→슬러그)이 항상 대칭이다.
 */

/**
 * 루트 라우트로 예약된 슬러그. 종목 슬러그가 여기 걸리면 빌드를 실패시킨다.
 * 나중에 /about 같은 페이지를 추가할 때도 여기 먼저 넣어야 한다.
 */
export const RESERVED_SLUGS = new Set([
  "api", "board", "data", "privacy", "about", "terms", "sitemap", "robots",
  "_next", "favicon.ico", "opengraph-image", "icon", "manifest",
]);

/**
 * @description 종목명을 URL 슬러그로 정규화한다.
 * 종목명에는 &(104개)·괄호(207개)·하이픈(71개)이 섞여 있어 그대로 쓸 수 없다.
 * NFC 정규화가 먼저다 — macOS IME 경유 링크가 NFD로 들어오면 다른 문자열이 된다.
 * @param {string} name
 * @returns {string} 소문자 슬러그
 */
export const toSlug = (name) =>
  String(name)
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[&./()·・,'"+~\-_[\]{}!?:;*#@$%^=|\\<>]/g, "")
    .toLowerCase();

/** 우선주: 삼성전자우, 현대차2우B, LG화학우 */
const PREFERRED = /\d*우B?$/;
/** 스팩: 합병 전까지 가격이 고정이라 비교 대상이 아니다 */
const SPAC = /(스팩|기업인수목적)/;
/** 리츠: 배당이 수익의 대부분인데 배당 미반영이라 수익률이 실제보다 낮게 보인다 */
const REIT = /(리츠|위탁관리부동산|자기관리부동산)/;

/**
 * @description 국내 종목을 분류한다. null이면 유니버스에서 제외.
 * @param {{name: string, endType?: string}} s
 * @returns {"주식"|"우선주"|"리츠"|null}
 */
export const classifyKr = (s) => {
  if (SPAC.test(s.name)) return null;
  if (PREFERRED.test(s.name)) return "우선주";
  if (REIT.test(s.name)) return "리츠";
  return "주식";
};

/**
 * @description 슬러그 충돌을 코드 접미사로 해소하고 예약어 충돌은 던진다.
 * @param {Array<{code: string, name: string}>} entries
 * @returns {Map<string, string>} code → slug
 * @throws 예약어와 충돌하는데 코드 접미사로도 못 피하는 경우
 */
export const assignSlugs = (entries) => {
  const bySlug = new Map();
  for (const e of entries) {
    const base = toSlug(e.name) || e.code.toLowerCase();
    if (!bySlug.has(base)) bySlug.set(base, []);
    bySlug.get(base).push(e);
  }

  const out = new Map();
  for (const [base, group] of bySlug) {
    // 충돌하거나 예약어면 코드를 붙여 유일하게 만든다
    const needsSuffix = group.length > 1 || RESERVED_SLUGS.has(base);
    for (const e of group) {
      // 접미사에 하이픈을 쓰면 안 된다 — toSlug가 하이픈을 제거하므로 파싱 시 되찾을 수 없다
      const slug = needsSuffix ? `${base}${toSlug(e.code)}` : base;
      if (RESERVED_SLUGS.has(slug)) {
        throw new Error(`슬러그가 예약어와 충돌: ${slug} (${e.code} ${e.name}) — RESERVED_SLUGS 확인 필요`);
      }
      out.set(e.code, slug);
    }
  }
  return out;
};

/**
 * @description 검색 별칭을 만든다. 종목코드·영문명·티커로도 도달할 수 있게 한다.
 * 별칭으로 들어오면 canonical 슬러그로 308 리다이렉트해 링크 자산을 한 URL에 모은다.
 * @param {Array<{code: string, name: string, nameEng?: string, symbol?: string}>} entries
 * @param {Map<string,string>} slugByCode
 * @returns {Record<string, string>} alias → code
 */
export const buildAliases = (entries, slugByCode) => {
  const aliases = {};
  const canonical = new Set(slugByCode.values());

  const put = (key, code) => {
    if (!key || canonical.has(key) || aliases[key]) return; // canonical과 겹치면 별칭으로 두지 않는다
    aliases[key] = code;
  };

  for (const e of entries) {
    // 심볼·코드도 슬러그와 같은 규칙으로 정규화한다 — "BRK.B"가 URL에 brk.b로 들어가면 안 된다
    put(toSlug(e.code), e.code);
    if (e.symbol) put(toSlug(e.symbol), e.code);
    if (e.nameEng) put(toSlug(e.nameEng), e.code);
  }
  return aliases;
};
