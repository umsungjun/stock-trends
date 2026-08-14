import type { Ticker } from "@/types/market";

import { describe, expect, it } from "vitest";

import { choseong, matchTickers } from "./search";

const make = (
  code: string,
  name: string,
  kind: Ticker["kind"] = "주식",
  englishName?: string
): Ticker => ({
  code,
  name,
  slug: name.toLowerCase(),
  kind,
  market: code.match(/^\d/) ? "KR" : "US",
  offset: 0,
  englishName,
  choseong: choseong(name),
  active: true,
});

const TICKERS = [
  make("005930", "삼성전자"),
  make("005935", "삼성전자우", "우선주"),
  make("028260", "삼성물산"),
  make("000660", "SK하이닉스"),
  make("069500", "KODEX 200", "ETF"),
  make("NVDA", "엔비디아", "주식", "NVIDIA Corp"),
  make("AAPL", "애플", "주식", "Apple Inc"),
];

describe("choseong", () => {
  it("한글을 초성으로 바꾼다", () => {
    expect(choseong("삼성전자")).toBe("ㅅㅅㅈㅈ");
    expect(choseong("엔비디아")).toBe("ㅇㅂㄷㅇ");
    expect(choseong("현대차")).toBe("ㅎㄷㅊ");
  });

  it("쌍자음 초성을 구분한다", () => {
    expect(choseong("따릉이")).toBe("ㄸㄹㅇ");
  });

  it("한글이 아닌 문자는 그대로 두고 소문자화한다", () => {
    expect(choseong("KODEX 200")).toBe("kodex 200");
    expect(choseong("TIGER 미국")).toBe("tiger ㅁㄱ");
  });
});

describe("matchTickers", () => {
  it("정확히 일치하는 것이 가장 먼저다", () => {
    expect(matchTickers(TICKERS, "삼성전자")[0].code).toBe("005930");
  });

  it("접두 일치가 부분 일치보다 앞선다", () => {
    const hits = matchTickers(TICKERS, "삼성");
    expect(hits[0].name.startsWith("삼성")).toBe(true);
  });

  it("초성으로 찾는다", () => {
    expect(matchTickers(TICKERS, "ㅅㅅㅈㅈ")[0].code).toBe("005930");
    expect(matchTickers(TICKERS, "ㅇㅂㄷㅇ")[0].code).toBe("NVDA");
  });

  it("종목코드로 찾는다", () => {
    expect(matchTickers(TICKERS, "005930")[0].code).toBe("005930");
  });

  it("영문명으로 찾는다", () => {
    expect(matchTickers(TICKERS, "nvidia")[0].code).toBe("NVDA");
    expect(matchTickers(TICKERS, "apple")[0].code).toBe("AAPL");
  });

  it("우선주는 같은 점수대에서 뒤로 밀린다", () => {
    const hits = matchTickers(TICKERS, "삼성전자");
    const normal = hits.findIndex((t) => t.code === "005930");
    const preferred = hits.findIndex((t) => t.code === "005935");
    expect(normal).toBeLessThan(preferred);
  });

  it("빈 질의는 결과가 없다", () => {
    expect(matchTickers(TICKERS, "")).toEqual([]);
    expect(matchTickers(TICKERS, "   ")).toEqual([]);
  });

  it("결과 수를 제한한다", () => {
    expect(matchTickers(TICKERS, "ㅅ", 2)).toHaveLength(2);
  });

  it("대소문자를 가리지 않는다", () => {
    expect(matchTickers(TICKERS, "AAPL")[0].code).toBe("AAPL");
    expect(matchTickers(TICKERS, "aapl")[0].code).toBe("AAPL");
  });
});
