import type { MarketMeta, RawSeries, Series } from "@/types/market";

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { compute } from "./compute";

/**
 * 실제 산출물(public/data)로 도는 통합 테스트.
 *
 * 데이터가 주간 갱신되므로 금액을 고정하지 않는다. 대신 **관계**를 검증한다 —
 * 시점별 환산이 오늘 환율 고정과 다르고, 그 차이가 환율 변동분과 정확히 맞는지.
 * 환율 적용을 잘못 구현하면 이 관계가 즉시 깨진다.
 */

const DATA = path.join(process.cwd(), "public", "data");
const AMOUNT = 100_000_000;

const readJson = <T>(...parts: string[]): T =>
  JSON.parse(readFileSync(path.join(DATA, ...parts), "utf8")) as T;

const meta = readJson<MarketMeta>("meta.json");

const load = (code: string, market: "KR" | "US"): Series => {
  const raw = readJson<RawSeries>(
    market === "US" ? "us" : "kr",
    `${code}.json`
  );
  return { code, offset: raw.o, values: raw.v, market };
};

const gridLength = meta.weeks.length;

describe("실제 데이터 — 환율은 시점별로 적용된다", () => {
  it("애플 10년: 시점별 환산이 오늘 환율 고정보다 크다", () => {
    const aapl = load("AAPL", "US");
    const { range, rows } = compute([aapl], "10y", AMOUNT, gridLength, meta.fx);
    const [row] = rows;

    // 환율 시계열에서 시작·끝 환율을 직접 꺼내 기대값을 만든다
    const fxStart = meta.fx.v[range.start - meta.fx.o];
    const fxEnd = meta.fx.v[range.end - meta.fx.o];
    const fxRatio = fxEnd / fxStart;

    const asIf오늘고정 = AMOUNT * (1 + row.priceReturn);
    const 시점별 = row.final;

    expect(시점별 / asIf오늘고정).toBeCloseTo(fxRatio, 6);
    expect(row.fxReturn).toBeCloseTo(fxRatio - 1, 6);

    // 원/달러가 오른 구간이므로 시점별이 더 커야 한다
    expect(fxRatio).toBeGreaterThan(1);
    expect(시점별).toBeGreaterThan(asIf오늘고정);
  });

  it("총수익률이 주가수익률 × 환율수익률과 일치한다", () => {
    for (const code of ["AAPL", "NVDA", "SPY"]) {
      const { rows } = compute(
        [load(code, "US")],
        "10y",
        AMOUNT,
        gridLength,
        meta.fx
      );
      const [row] = rows;
      expect((1 + row.priceReturn) * (1 + row.fxReturn!) - 1).toBeCloseTo(
        row.total,
        6
      );
    }
  });

  it("한국 종목은 환율 기여분이 없다", () => {
    const { rows } = compute(
      [load("005930", "KR")],
      "10y",
      AMOUNT,
      gridLength,
      meta.fx
    );
    expect(rows[0].fxReturn).toBeNull();
    expect(rows[0].total).toBeCloseTo(rows[0].priceReturn, 9);
  });
});

describe("실제 데이터 — 한국·미국 주차 정렬", () => {
  it("코로나 저점이 같은 주차 인덱스에 찍힌다", () => {
    // 미국 주봉은 일요일 앵커라 +1일 보정이 없으면 한 주씩 밀린다.
    // 그 오류는 차트가 "대충 맞아 보여서" 발견이 늦으므로 여기서 못 박는다
    const from = meta.weeks.findIndex((w) => w >= "20200201");
    const to = meta.weeks.findIndex((w) => w >= "20200501");

    const lowIndex = (s: Series) => {
      let min = Infinity;
      let at = -1;
      for (let i = from; i <= to; i++) {
        const v = s.values[i - s.offset];
        if (v != null && v < min) {
          min = v;
          at = i;
        }
      }
      return at;
    };

    const kr = lowIndex(load("005930", "KR"));
    const us = lowIndex(load("AAPL", "US"));
    const spy = lowIndex(load("SPY", "US"));

    expect(kr).toBeGreaterThan(0);
    expect(us).toBe(kr);
    expect(spy).toBe(kr);
    expect(meta.weeks[kr]).toBe("20200320");
  });
});

describe("실제 데이터 — 구간 축소", () => {
  it("상장이 늦은 종목이 구간을 좁히고 원인을 알려준다", () => {
    // TIGER 미국S&P500은 2020-08 상장이라 10년 요청이 그 시점으로 좁혀진다
    const { range } = compute(
      [load("005930", "KR"), load("360750", "KR")],
      "10y",
      AMOUNT,
      gridLength,
      meta.fx
    );

    expect(range.clamped).toBe(true);
    expect(range.reason).toBe("listing");
    expect(range.byCode).toBe("360750");
    expect(meta.weeks[range.start] >= "20200801").toBe(true);
  });

  it("미국 종목의 전체 기간은 환율 시작 이전으로 가지 않는다", () => {
    const { range } = compute(
      [load("AAPL", "US")],
      "max",
      AMOUNT,
      gridLength,
      meta.fx
    );
    expect(range.start).toBeGreaterThanOrEqual(meta.fx.o);
  });

  it("모든 계열의 시작 평가액이 원금과 같다", () => {
    const { rows } = compute(
      [load("005930", "KR"), load("AAPL", "US"), load("NVDA", "US")],
      "5y",
      AMOUNT,
      gridLength,
      meta.fx
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r.values[0]).toBeCloseTo(AMOUNT, 3);
  });
});
