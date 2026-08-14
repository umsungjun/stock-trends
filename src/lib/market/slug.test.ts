import { describe, expect, it } from "vitest";

import {
  type SlugResolver,
  buildSlug,
  isReserved,
  normalizeSlug,
  parseSlug,
} from "./slug";

/** 실제 유니버스에서 뽑은 까다로운 케이스들 */
const FIXTURES = [
  { code: "005930", slug: "삼성전자" },
  { code: "360750", slug: "tiger미국sp500" }, // 원본: "TIGER 미국S&P500"
  { code: "AAPL", slug: "애플" },
  { code: "BRK-B", slug: "버크셔해서웨이classb" },
  { code: "0228G0", slug: "ace반도체plus전략산업" },
];

const resolver: SlugResolver = {
  bySlug: new Map(FIXTURES.map((f) => [f.slug, f.code])),
  slugOf: new Map(FIXTURES.map((f) => [f.code, f.slug])),
  byAlias: new Map([
    ["aapl", "AAPL"],
    ["005930", "005930"],
    ["brkb", "BRK-B"],
    ["appleinc", "AAPL"],
  ]),
};

describe("normalizeSlug", () => {
  it("공백과 URL 위험 문자를 제거한다", () => {
    expect(normalizeSlug("TIGER 미국S&P500")).toBe("tiger미국sp500");
    expect(normalizeSlug("KODEX 종합채권(AA-이상)액티브")).toBe(
      "kodex종합채권aa이상액티브"
    );
    expect(normalizeSlug("HANARO Fn K-반도체")).toBe("hanarofnk반도체");
    expect(normalizeSlug("BRK.B")).toBe("brkb");
  });

  it("NFD로 들어온 한글을 NFC로 맞춘다", () => {
    // macOS IME·파일명을 거친 링크는 자모가 분리된 형태로 올 수 있다
    const nfd = "삼성전자".normalize("NFD");
    expect(nfd).not.toBe("삼성전자");
    expect(normalizeSlug(nfd)).toBe("삼성전자");
  });

  it("대소문자를 통일한다", () => {
    expect(normalizeSlug("AAPL")).toBe(normalizeSlug("aapl"));
  });
});

describe("parseSlug", () => {
  it("단일 종목을 해석한다", () => {
    const r = parseSlug("삼성전자", resolver);
    expect(r.codes).toEqual(["005930"]);
    expect(r.needsRedirect).toBe(false);
  });

  it("여러 종목을 -vs- 로 나눈다", () => {
    const r = parseSlug("삼성전자-vs-애플", resolver);
    expect(r.codes).toEqual(["005930", "AAPL"]);
    expect(r.canonical).toBe("삼성전자-vs-애플");
    expect(r.needsRedirect).toBe(false);
  });

  it("종목명 안의 하이픈이 구분자와 섞이지 않는다", () => {
    // "hanarofnk반도체"에는 하이픈이 없지만, 원본 이름에 있던 것이 정규화로 사라진 형태다.
    // 구분자는 "-vs-" 3글자 토큰이라 단독 하이픈과 충돌하지 않는다
    const r = parseSlug("tiger미국sp500-vs-삼성전자", resolver);
    expect(r.codes).toEqual(["360750", "005930"]);
  });

  it("별칭으로 들어오면 canonical로 리다이렉트를 요구한다", () => {
    const r = parseSlug("aapl", resolver);
    expect(r.codes).toEqual(["AAPL"]);
    expect(r.canonical).toBe("애플");
    expect(r.needsRedirect).toBe(true);
  });

  it("종목코드로도 도달한다", () => {
    const r = parseSlug("005930-vs-brkb", resolver);
    expect(r.codes).toEqual(["005930", "BRK-B"]);
    expect(r.canonical).toBe("삼성전자-vs-버크셔해서웨이classb");
    expect(r.needsRedirect).toBe(true);
  });

  it("대소문자·NFD 차이도 리다이렉트로 흡수한다", () => {
    expect(parseSlug("삼성전자".normalize("NFD"), resolver).needsRedirect).toBe(
      true
    );
  });

  it("같은 종목이 중복되면 하나만 남긴다", () => {
    const r = parseSlug("삼성전자-vs-005930", resolver);
    expect(r.codes).toEqual(["005930"]);
    expect(r.needsRedirect).toBe(true);
  });

  it("5개를 넘으면 잘라낸다", () => {
    const many = FIXTURES.map((f) => f.slug).join("-vs-") + "-vs-aapl";
    const r = parseSlug(many, resolver);
    expect(r.codes).toHaveLength(5);
  });

  it("해석 실패한 토큰을 따로 보고한다", () => {
    const r = parseSlug("삼성전자-vs-없는종목", resolver);
    expect(r.codes).toEqual(["005930"]);
    expect(r.unresolved).toEqual(["없는종목"]);
    expect(r.needsRedirect).toBe(true); // 해석된 것만으로 canonical을 다시 만든다
  });

  it("전부 실패하면 코드가 비고 리다이렉트하지 않는다 (404 대상)", () => {
    const r = parseSlug("asdfasdf", resolver);
    expect(r.codes).toEqual([]);
    expect(r.needsRedirect).toBe(false);
  });
});

describe("buildSlug — 파싱과 역파싱의 대칭", () => {
  it("모든 픽스처가 왕복한다", () => {
    for (const f of FIXTURES) {
      const slug = buildSlug([f.code], resolver);
      expect(slug).toBe(f.slug);
      expect(parseSlug(slug, resolver).codes).toEqual([f.code]);
    }
  });

  it("조합도 왕복한다", () => {
    const codes = ["005930", "AAPL", "BRK-B"];
    const slug = buildSlug(codes, resolver);
    const parsed = parseSlug(slug, resolver);
    expect(parsed.codes).toEqual(codes);
    expect(parsed.needsRedirect).toBe(false);
  });
});

describe("예약어", () => {
  it("루트 라우트 이름을 잡아낸다", () => {
    expect(isReserved("board")).toBe(true);
    expect(isReserved("API")).toBe(true);
    expect(isReserved("privacy")).toBe(true);
    expect(isReserved("삼성전자")).toBe(false);
  });
});
