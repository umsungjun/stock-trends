import PageContainer from "@/components/layout/PageContainer";
import { HOME_HEADING, HOME_SUBHEADING } from "@/lib/site";

import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

/**
 * 임시 홈 — Phase 4에서 비교 도구로 대체된다.
 * 지금은 서버에서 public/data를 fs로 읽는 경로가 살아 있는지 확인하는 용도다.
 * (이 경로가 깨지면 배포 후 온디맨드 생성에서만 500이 나서 발견이 늦다)
 */
const readMeta = async () => {
  const file = path.join(process.cwd(), "public/data/meta.json");
  return JSON.parse(await readFile(file, "utf8")) as {
    asOfDate: string;
    asOfWeek: string;
    weeks: string[];
    fx: { o: number; v: number[] };
    sources: Record<string, string>;
  };
};

const readTickerCount = async () => {
  const file = path.join(process.cwd(), "public/data/tickers.json");
  const d = JSON.parse(await readFile(file, "utf8")) as { tickers: unknown[] };
  return d.tickers.length;
};

const ymd = (s: string) => `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;

export default async function HomePage() {
  const [meta, count] = await Promise.all([readMeta(), readTickerCount()]);
  const fxLatest = meta.fx.v[meta.fx.v.length - 1];

  const stats = [
    { label: "종목", value: count.toLocaleString("ko-KR"), unit: "개" },
    {
      label: "주차",
      value: meta.weeks.length.toLocaleString("ko-KR"),
      unit: "주",
    },
    { label: "원/달러", value: fxLatest.toLocaleString("ko-KR"), unit: "원" },
  ];

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold tracking-tight">{HOME_HEADING}</h1>
      <p className="mt-1 text-[13px] text-ink-2">{HOME_SUBHEADING}</p>

      <section className="mt-6 border border-hairline bg-surface">
        <div className="grid grid-cols-3 divide-x divide-hairline">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-5">
              <div className="text-[11px] tracking-wide text-ink-muted">
                {s.label}
              </div>
              <div className="tnum mt-1 text-xl font-semibold">
                {s.value}
                <span className="ml-0.5 text-[13px] font-normal text-ink-muted">
                  {s.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-hairline px-4 py-3 text-[12px] text-ink-muted">
          {ymd(meta.weeks[0])} ~ {ymd(meta.asOfDate)} ({meta.asOfWeek}) · 출처{" "}
          {meta.sources.kr} / {meta.sources.us} / 환율 {meta.sources.fx}
        </div>
      </section>

      <p className="mt-6 text-[13px] text-ink-muted">
        비교 도구는 준비 중입니다. 데이터 파이프라인과 화면 골격까지
        완료됐습니다.
      </p>
    </PageContainer>
  );
}
