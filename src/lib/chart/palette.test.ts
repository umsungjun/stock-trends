import { describe, expect, it } from "vitest";

import { MAX_PICKS, assignSlots, slotColor, slotHex } from "./palette";

describe("assignSlots — 같은 조합이면 언제나 같은 색", () => {
  it("순서를 바꿔도 배정이 같다", () => {
    // 프로토타입은 사용자가 고른 순서대로 탐사해서 A-vs-B와 B-vs-A의 색이 달라질 수 있었다.
    // 공유 URL의 순서만 다른 두 링크가 다른 화면을 보여주면 "같은 조합 = 같은 화면"이 깨진다
    const a = assignSlots(["005930", "AAPL"]);
    const b = assignSlots(["AAPL", "005930"]);
    expect(a).toEqual(b);
  });

  it("3개 이상에서도 순서 독립이다", () => {
    const codes = ["005930", "AAPL", "NVDA", "069500", "SPY"];
    const shuffled = ["SPY", "NVDA", "005930", "AAPL", "069500"];
    expect(assignSlots(codes)).toEqual(assignSlots(shuffled));
  });

  it("여러 번 불러도 같은 결과다", () => {
    const codes = ["005930", "AAPL", "NVDA"];
    expect(assignSlots(codes)).toEqual(assignSlots(codes));
  });

  it("슬롯이 겹치지 않는다", () => {
    const codes = ["005930", "AAPL", "NVDA", "069500", "SPY"];
    const slots = Object.values(assignSlots(codes));
    expect(new Set(slots).size).toBe(codes.length);
  });

  it("모든 슬롯이 유효 범위 안이다", () => {
    for (const slot of Object.values(assignSlots(["A", "B", "C", "D", "E"]))) {
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(MAX_PICKS);
    }
  });

  it("종목을 뺐다 다시 넣어도 나머지 색이 유지되는 경우가 대부분이다", () => {
    const three = assignSlots(["005930", "AAPL", "NVDA"]);
    const removed = assignSlots(["005930", "AAPL"]);
    // 해시 선호 슬롯이 그대로라 충돌이 없으면 유지된다
    expect(removed["005930"]).toBe(three["005930"]);
  });

  it("빈 입력을 견딘다", () => {
    expect(assignSlots([])).toEqual({});
  });
});

describe("색 토큰", () => {
  it("화면은 CSS 변수, OG는 리터럴 hex를 쓴다", () => {
    // satori(OG 이미지 생성기)는 CSS 변수를 해석하지 못한다 —
    // 그래서 compute에서 색을 떼어내고 여기서 두 형태를 따로 제공한다
    expect(slotColor(0)).toBe("var(--chart-1)");
    expect(slotHex(0)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("범위를 벗어난 슬롯도 안전하게 감싼다", () => {
    expect(slotColor(7)).toBe(slotColor(2));
    expect(slotHex(7)).toBe(slotHex(2));
  });
});
