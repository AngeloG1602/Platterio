"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useNow } from "@/lib/data";
import { periodRange, type Period, type PeriodPreset } from "@/lib/domain/analytics";
import { formatDay } from "@/lib/domain/format";

const iso = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Estado del filtro de periodo (hoy, 7 días, 14 días o fechas propias). */
export function usePeriod(initial: PeriodPreset = "7d") {
  const now = useNow(60_000);
  const minuteNow = Math.floor(now / 60_000) * 60_000;
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [custom, setCustom] = useState(() => ({
    from: iso(minuteNow - 6 * 86_400_000),
    to: iso(minuteNow),
  }));
  const period: Period = useMemo(
    () => periodRange(preset, minuteNow, custom),
    [preset, minuteNow, custom],
  );
  return { preset, setPreset, custom, setCustom, period, now: minuteNow };
}

export function describePeriod(period: Period): string {
  const a = formatDay(new Date(period.from));
  const b = formatDay(new Date(period.to));
  return a === b ? a : `del ${a} al ${b}`;
}

export function PeriodFilter({ state }: { state: ReturnType<typeof usePeriod> }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        label="Periodo"
        value={state.preset}
        onChange={state.setPreset}
        className="w-full sm:w-auto sm:min-w-[340px]"
        options={[
          { value: "hoy", label: "Hoy" },
          { value: "7d", label: "7 días" },
          { value: "14d", label: "14 días" },
          { value: "personalizado", label: "Fechas" },
        ]}
      />
      {state.preset === "personalizado" && (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="desde">
            Desde
          </label>
          <Input
            id="desde"
            type="date"
            value={state.custom.from}
            max={state.custom.to}
            onChange={(e) => state.setCustom((c) => ({ ...c, from: e.target.value }))}
            className="w-40"
          />
          <span className="text-muted" aria-hidden>
            –
          </span>
          <label className="sr-only" htmlFor="hasta">
            Hasta
          </label>
          <Input
            id="hasta"
            type="date"
            value={state.custom.to}
            min={state.custom.from}
            onChange={(e) => state.setCustom((c) => ({ ...c, to: e.target.value }))}
            className="w-40"
          />
        </div>
      )}
    </div>
  );
}
