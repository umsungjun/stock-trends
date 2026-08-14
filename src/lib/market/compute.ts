/**
 * 수익률 계산 — 이 프로젝트에서 숫자가 틀리면 안 되는 유일한 곳.
 *
 * 순수 함수다. 색·DOM·CSS 변수를 알지 못한다 — OG 이미지 생성기(satori)가 같은 함수를 쓰기 때문이다.
 * 색 배정은 chart/palette.ts가 따로 한다.
 */
import type { Market, PeriodId, Series } from "@/types/market";

/** 한 해의 주차 수. CAGR 환산에 쓴다 */
export const WEEKS_PER_YEAR = 52.1775;

/** 저장 해상도는 주봉이다 — 월말 종가만 보면 중간 저점이 사라져 MDD가 실제보다 얕게 나온다 */
export const PERIODS: { id: PeriodId; label: string; weeks: number }[] = [
  { id: "1y", label: "1년", weeks: 52 },
  { id: "3y", label: "3년", weeks: 157 },
  { id: "5y", label: "5년", weeks: 261 },
  { id: "10y", label: "10년", weeks: 522 },
  { id: "max", label: "전체", weeks: Number.POSITIVE_INFINITY },
];

export interface FxSeries {
  /** 환율이 시작하는 그리드 인덱스 */
  o: number;
  v: number[];
}

export interface ResolvedRange {
  start: number;
  end: number;
  /** 요청한 기간보다 좁아졌는가 */
  clamped: boolean;
  /** 구간을 좁힌 원인 */
  reason: "listing" | "fx" | null;
  /** reason이 listing일 때 그 종목 코드 */
  byCode: string | null;
}

export interface ComputedRow {
  code: string;
  market: Market;
  /** 원화 평가액 곡선 */
  values: number[];
  final: number;
  /** 총수익률 (환율 포함) */
  total: number;
  /** 현지통화 기준 주가 수익률 */
  priceReturn: number;
  /** 환율 수익률. 한국 종목은 null */
  fxReturn: number | null;
  cagr: number;
  /** 최대 낙폭 — 음수 */
  mdd: number;
}

export interface ComputeResult {
  range: ResolvedRange;
  rows: ComputedRow[];
}

/** 그리드 인덱스의 값. 구간 밖이면 null */
const at = (s: Series, i: number): number | null => {
  const k = i - s.offset;
  return k >= 0 && k < s.values.length ? s.values[k] : null;
};

const fxAt = (fx: FxSeries, i: number): number | null => {
  const k = i - fx.o;
  return k >= 0 && k < fx.v.length ? fx.v[k] : null;
};

/**
 * @description 실제로 비교 가능한 구간을 정한다.
 *
 * 요청한 기간, 각 종목의 상장 시점, 그리고 미국 종목이 있으면 환율 시작 시점 중
 * 가장 늦은 곳에서 시작한다. 환율이 없는 구간은 원화 환산이 불가능하다.
 * @param series - 선택된 종목들
 * @param period - 요청 기간
 * @param gridLength - 전체 주차 수
 * @param fx - 환율 시계열
 */
export const resolveRange = (
  series: Series[],
  period: PeriodId,
  gridLength: number,
  fx: FxSeries
): ResolvedRange => {
  const end = gridLength - 1;
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[3];
  const wanted = Number.isFinite(p.weeks) ? Math.max(0, end - p.weeks) : 0;

  let start = wanted;
  let reason: ResolvedRange["reason"] = null;
  let byCode: string | null = null;

  for (const s of series) {
    // 마지막 실관측 이후로는 데이터가 없으므로 시작점만 본다
    if (s.offset > start) {
      start = s.offset;
      reason = "listing";
      byCode = s.code;
    }
  }

  if (series.some((s) => s.market === "US") && fx.o > start) {
    start = fx.o;
    reason = "fx";
    byCode = null;
  }

  return { start, end, clamped: start > wanted, reason, byCode };
};

/** 최대 낙폭 — 고점 대비 가장 크게 떨어졌던 폭 (음수) */
const maxDrawdown = (values: number[]): number => {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
};

/**
 * @description 선택한 종목들의 원화 평가액 곡선과 지표를 계산한다.
 *
 * 미국 종목은 **각 시점의 환율**로 환산한다. 오늘 환율을 전 구간에 곱하면 곡선 모양이
 * 달러 차트와 똑같아지고 눈금만 원화가 되는데, 그건 "1억 넣었으면 얼마"의 답이 아니다.
 * 실측 차이가 크다 — 애플 10년 1억이 시점별 14.44억 vs 오늘 고정 11.46억.
 *
 * 총수익률은 `주가수익률 × 환율수익률`로 분해해 표에 따로 보여준다.
 * @param series - 선택된 종목들 (현지통화 종가)
 * @param range - resolveRange 결과
 * @param amount - 투자 원금 (원)
 * @param fx - 원/달러 시계열
 * @returns 종목별 계산 결과. 구간 내 데이터가 없는 종목은 제외된다
 */
export const computeRows = (
  series: Series[],
  range: ResolvedRange,
  amount: number,
  fx: FxSeries
): ComputedRow[] => {
  const rows: ComputedRow[] = [];

  for (const s of series) {
    const basePrice = at(s, range.start);
    if (basePrice === null || basePrice <= 0) continue;

    const isUs = s.market === "US";
    const baseFx = isUs ? fxAt(fx, range.start) : 1;
    if (baseFx === null || baseFx <= 0) continue;

    const values: number[] = [];
    let lastPrice = basePrice;
    let lastFx = baseFx;

    for (let i = range.start; i <= range.end; i++) {
      const price = at(s, i);
      if (price !== null) lastPrice = price;
      if (isUs) {
        const rate = fxAt(fx, i);
        if (rate !== null) lastFx = rate;
      }
      // 상장폐지·거래정지로 배열이 끝나면 마지막 관측값을 유지한다
      values.push(amount * (lastPrice / basePrice) * (lastFx / baseFx));
    }

    const final = values[values.length - 1];
    const years = (range.end - range.start) / WEEKS_PER_YEAR;
    const total = final / amount - 1;

    rows.push({
      code: s.code,
      market: s.market,
      values,
      final,
      total,
      priceReturn: lastPrice / basePrice - 1,
      fxReturn: isUs ? lastFx / baseFx - 1 : null,
      cagr: years > 0 ? Math.pow(1 + total, 1 / years) - 1 : 0,
      mdd: maxDrawdown(values),
    });
  }

  return rows;
};

/**
 * @description resolveRange + computeRows를 한 번에.
 * @param series - 선택된 종목들
 * @param period - 요청 기간
 * @param amount - 투자 원금
 * @param gridLength - 전체 주차 수
 * @param fx - 환율 시계열
 */
export const compute = (
  series: Series[],
  period: PeriodId,
  amount: number,
  gridLength: number,
  fx: FxSeries
): ComputeResult => {
  const range = resolveRange(series, period, gridLength, fx);
  return { range, rows: computeRows(series, range, amount, fx) };
};
