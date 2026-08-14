"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PERIODS } from "@/lib/market/compute";
import { AMOUNTS } from "@/lib/market/constants";
import type { PeriodId } from "@/types/market";


interface ControlBarProps {
  period: PeriodId;
  amount: number;
  onPeriodChange: (p: PeriodId) => void;
  onAmountChange: (v: number) => void;
}

/**
 * @description 기간·투자금 컨트롤. 값을 바꿔도 네트워크 요청은 없다 —
 * 이미 받은 배열로 다시 계산할 뿐이다.
 * @param props.period - 현재 기간
 * @param props.amount - 현재 투자금
 * @param props.onPeriodChange - 기간 변경 콜백
 * @param props.onAmountChange - 투자금 변경 콜백
 */
export default function ControlBar({
  period,
  amount,
  onPeriodChange,
  onAmountChange,
}: ControlBarProps) {
  const preset = AMOUNTS.find((a) => a.value === amount);
  const [custom, setCustom] = useState(!preset);

  const handleCustom = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 12);
    const n = Number(digits);
    if (n > 0) onAmountChange(n);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <span className="text-ink-muted text-[12px]" id="lbl-period">
          기간
        </span>
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(v) => v && onPeriodChange(v as PeriodId)}
          aria-labelledby="lbl-period"
          variant="outline"
          size="sm"
        >
          {PERIODS.map((p) => (
            <ToggleGroupItem
              key={p.id}
              value={p.id}
              className="px-3 text-[13px]"
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-ink-muted text-[12px]" id="lbl-amount">
          투자금
        </span>
        <ToggleGroup
          type="single"
          value={custom ? "custom" : String(amount)}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            onAmountChange(Number(v));
          }}
          aria-labelledby="lbl-amount"
          variant="outline"
          size="sm"
        >
          {AMOUNTS.map((a) => (
            <ToggleGroupItem
              key={a.id}
              value={String(a.value)}
              className="px-3 text-[13px]"
            >
              {a.label}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="custom" className="px-3 text-[13px]">
            직접
          </ToggleGroupItem>
        </ToggleGroup>

        {custom && (
          <Input
            inputMode="numeric"
            aria-label="투자금 직접 입력 (원)"
            defaultValue={amount.toLocaleString("ko-KR")}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              e.target.value = digits
                ? Number(digits).toLocaleString("ko-KR")
                : "";
              handleCustom(digits);
            }}
            className="tnum h-8 w-32 text-[13px]"
          />
        )}
      </div>
    </div>
  );
}
