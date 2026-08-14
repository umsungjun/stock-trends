"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocationSearch } from "@/hooks/useLocation";
import { assignSlots } from "@/lib/chart/palette";
import { requestTicker } from "@/lib/board/request-ticker.client";
import { compute } from "@/lib/market/compute";
import { DEFAULT_AMOUNT, DEFAULT_PERIOD } from "@/lib/market/constants";
import { loadSeries, primeSeries } from "@/lib/market/series.client";
import type { PeriodId, Series, Ticker } from "@/types/market";

import { toast } from "sonner";

import ControlBar from "./ControlBar";
import PickChips from "./PickChips";
import RangeNotice from "./RangeNotice";
import ResultTable from "./ResultTable";
import ShareBar from "./ShareBar";
import TickerSearch from "./TickerSearch";
import ValueChart from "./ValueChart";

const PERIOD_IDS: PeriodId[] = ["1y", "3y", "5y", "10y", "max"];

interface CompareViewProps {
  /** 서버가 슬러그로부터 해석해 넘긴 초기 종목 */
  initialTickers: Ticker[];
  /** 서버가 이미 읽어둔 시계열 — 첫 렌더에서 fetch가 없다 */
  initialSeries: Series[];
  weeks: string[];
  fx: { o: number; v: number[] };
  host: string;
}

/**
 * @description 비교 도구의 유일한 클라이언트 경계.
 *
 * 상태(picks·period·amount)가 차트·표·칩·공유링크 전부에 걸쳐 있어 더 잘게 쪼개면
 * Context나 prop drilling이 필요해진다. 대신 SEO용 서버 컴포넌트들은 밖에 둬서
 * JS 번들에 들어가지 않게 했다.
 *
 * URL은 세션 중에는 미러다 — replaceState로만 갱신한다. router.push를 쓰면
 * 이미 클라이언트가 가진 데이터를 서버에서 다시 받아오고 차트가 깜빡인다.
 * @param props.initialTickers - 초기 종목 메타
 * @param props.initialSeries - 서버가 주입한 시계열
 * @param props.weeks - 주차 라벨
 * @param props.fx - 환율 시계열
 * @param props.host - 공유 URL 표시용 호스트
 */
export default function CompareView({
  initialTickers,
  initialSeries,
  weeks,
  fx,
  host,
}: CompareViewProps) {
  const [picks, setPicks] = useState<Ticker[]>(initialTickers);
  const [seriesMap, setSeriesMap] = useState<Record<string, Series>>(() =>
    Object.fromEntries(initialSeries.map((s) => [s.code, s]))
  );
  // 사용자가 컨트롤을 만지기 전까지는 URL이 진실, 만진 뒤로는 상태가 진실이다
  const [chosenPeriod, setChosenPeriod] = useState<PeriodId | null>(null);
  const [chosenAmount, setChosenAmount] = useState<number | null>(null);

  const search = useLocationSearch();
  const fromUrl = useMemo(() => {
    const q = new URLSearchParams(search);
    const p = q.get("p");
    const a = Number(q.get("a"));
    return {
      period: PERIOD_IDS.includes(p as PeriodId) ? (p as PeriodId) : null,
      amount: a > 0 ? a : null,
    };
  }, [search]);

  const period = chosenPeriod ?? fromUrl.period ?? DEFAULT_PERIOD;
  const amount = chosenAmount ?? fromUrl.amount ?? DEFAULT_AMOUNT;

  // 서버가 준 시계열을 클라이언트 캐시에 심어 같은 종목을 다시 받지 않게 한다
  useEffect(() => {
    primeSeries(initialSeries);
  }, [initialSeries]);

  // URL 미러링 — 종목은 경로, 기간·투자금은 쿼리. 기본값이면 쿼리를 생략한다
  useEffect(() => {
    const path = `/${picks.map((t) => t.slug).join("-vs-")}`;
    const q = new URLSearchParams();
    if (period !== DEFAULT_PERIOD) q.set("p", period);
    if (amount !== DEFAULT_AMOUNT) q.set("a", String(amount));
    const qs = q.toString();
    window.history.replaceState(null, "", `${path}${qs ? `?${qs}` : ""}`);
  }, [picks, period, amount]);

  const shareePath = useMemo(
    () => `/${picks.map((t) => t.slug).join("-vs-")}`,
    [picks]
  );

  const slots = useMemo(() => assignSlots(picks.map((t) => t.code)), [picks]);
  const names = useMemo(
    () => Object.fromEntries(picks.map((t) => [t.code, t.name])),
    [picks]
  );

  const { range, rows } = useMemo(() => {
    const series = picks
      .map((t) => seriesMap[t.code])
      .filter((s): s is Series => Boolean(s));
    return compute(series, period, amount, weeks.length, fx);
  }, [picks, seriesMap, period, amount, weeks.length, fx]);

  const addTicker = async (t: Ticker) => {
    const loaded = await loadSeries(t.code, t.market);
    if (!loaded) {
      toast.error(`${t.name} 시세를 불러오지 못했습니다`);
      return;
    }
    setSeriesMap((prev) => ({ ...prev, [t.code]: loaded }));
    setPicks((prev) =>
      prev.some((p) => p.code === t.code) ? prev : [...prev, t]
    );
  };

  const showFx = picks.some((t) => t.market === "US");

  return (
    <div className="flex flex-col gap-4">
      <TickerSearch
        picked={picks.map((t) => t.code)}
        onPick={addTicker}
        onRequest={requestTicker}
      />

      <PickChips
        picks={picks}
        slots={slots}
        onRemove={(code) =>
          setPicks((prev) => prev.filter((p) => p.code !== code))
        }
      />

      <ControlBar
        period={period}
        amount={amount}
        onPeriodChange={setChosenPeriod}
        onAmountChange={setChosenAmount}
      />

      <RangeNotice range={range} names={names} weeks={weeks} />

      <div className="border-hairline bg-surface border p-3">
        <ValueChart
          rows={rows}
          slots={slots}
          names={names}
          weeks={weeks}
          startIndex={range.start}
          amount={amount}
        />
      </div>

      <ResultTable
        rows={rows}
        slots={slots}
        names={names}
        amount={amount}
        showFx={showFx}
      />

      {picks.length > 0 && <ShareBar path={shareePath} host={host} />}
    </div>
  );
}
