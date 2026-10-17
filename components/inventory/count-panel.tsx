"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import {
  inventoryActions,
  usePreparations,
  useRecipes,
  useInventoryMoves,
  useStockCounts,
} from "@/lib/data";
import { calibrations, deviations, type CountInput } from "@/lib/domain/counts";
import { formatDay, formatMoney, formatTime, plural } from "@/lib/domain/format";
import { fmtQty, parseQty, round3 } from "@/lib/domain/inventory";
import type { InventoryItem } from "@/lib/domain/types";

type Scope = "todo" | "cierre";

/** Conteo físico y cierre del día, con las desviaciones que salen de compararlos con las recetas. */
export function CountPanel({ items }: { items: readonly InventoryItem[] }) {
  const preps = usePreparations();
  const [scope, setScope] = useState<Scope>("todo");
  const [values, setValues] = useState<Record<string, string>>({});
  const [discard, setDiscard] = useState<Record<string, boolean>>({});
  const outputs = new Set(preps.map((p) => p.outputItemId));
  const list = scope === "cierre" ? items.filter((i) => outputs.has(i.id)) : items;

  function reset(next: Scope) {
    setScope(next);
    setValues({});
    setDiscard({});
  }

  function save() {
    const lines: CountInput[] = [];
    for (const item of list) {
      const text = values[item.id]?.trim();
      if (!text) continue;
      const counted = parseQty(text);
      if (!Number.isFinite(counted)) return toast.error(`Revisa lo contado de ${item.name}`);
      lines.push({ itemId: item.id, counted, discard: scope === "cierre" && !!discard[item.id] });
    }
    const r = inventoryActions.saveCount(lines, scope);
    if (!r.ok) return toast.error(r.error);
    toast.success(scope === "cierre" ? "Cierre del día registrado" : "Conteo registrado", {
      description:
        r.differences === 0
          ? "Todo cuadra con lo que dice el sistema."
          : `${plural(r.differences ?? 0, "producto con diferencia", "productos con diferencia")}.`,
    });
    setValues({});
    setDiscard({});
  }

  return (
    <>
      <Panel
        title={scope === "cierre" ? "Cierre del día" : "Conteo físico"}
        description={
          scope === "cierre"
            ? "Cuenta las porciones que quedaron. La diferencia con el sistema queda como ajuste y puedes dar de baja lo que sobró."
            : "Cuenta lo que hay de verdad y escríbelo. Deja vacío lo que no contaste. Cada diferencia queda como un ajuste con tu nombre."
        }
        action={
          <Segmented
            label="Qué se cuenta"
            value={scope}
            onChange={reset}
            className="w-64"
            options={[
              { value: "todo", label: "Todo" },
              { value: "cierre", label: "Cierre del día" },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <p className="text-muted text-[15px]">
            {scope === "cierre"
              ? "Todavía no hay preparaciones por lote."
              : "Todavía no hay productos en el inventario."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <caption className="sr-only">
                  {scope === "cierre" ? "Cierre del día" : "Conteo físico"}
                </caption>
                <thead className="text-muted text-sm">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Producto
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      En el sistema
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Contado
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Diferencia
                    </th>
                    {scope === "cierre" && (
                      <th scope="col" className="py-2 font-medium">
                        Lo que sobró
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {list.map((item) => {
                    const text = values[item.id] ?? "";
                    const counted = text.trim() ? parseQty(text) : undefined;
                    const diff =
                      counted !== undefined && Number.isFinite(counted)
                        ? round3(counted - item.qty)
                        : undefined;
                    return (
                      <tr key={item.id} className="align-middle">
                        <th scope="row" className="py-2 pr-4 font-medium">
                          {item.name}
                        </th>
                        <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">
                          {fmtQty(item.qty)} <span className="text-muted">{item.unit}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            aria-label={`Contado de ${item.name}`}
                            inputMode="decimal"
                            className="h-10 w-28"
                            value={text}
                            onChange={(e) =>
                              setValues((v) => ({
                                ...v,
                                [item.id]: e.target.value.replace(/[^\d.,]/g, ""),
                              }))
                            }
                          />
                        </td>
                        <td className="py-2 pr-4 text-right whitespace-nowrap tabular-nums">
                          {diff === undefined ? (
                            <span className="text-muted">—</span>
                          ) : diff === 0 ? (
                            <Badge tone="success">Cuadra</Badge>
                          ) : (
                            <Badge tone={diff < 0 ? "danger" : "warning"}>
                              {diff > 0 ? "+" : ""}
                              {fmtQty(diff)}
                            </Badge>
                          )}
                        </td>
                        {scope === "cierre" && (
                          <td className="py-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="size-4"
                                checked={!!discard[item.id]}
                                onChange={(e) =>
                                  setDiscard((d) => ({ ...d, [item.id]: e.target.checked }))
                                }
                              />
                              Dar de baja<span className="sr-only"> {item.name}</span>
                            </label>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={save}>
                {scope === "cierre" ? "Guardar cierre" : "Guardar conteo"}
              </Button>
            </div>
          </>
        )}
      </Panel>
      <Deviations items={items} />
    </>
  );
}

function Deviations({ items }: { items: readonly InventoryItem[] }) {
  const counts = useStockCounts();
  const moves = useInventoryMoves();
  const recipes = useRecipes();
  const preps = usePreparations();
  const devs = useMemo(
    () => deviations(counts, moves, items, preps),
    [counts, moves, items, preps],
  );
  const advice = useMemo(() => calibrations(devs, recipes, preps), [devs, recipes, preps]);
  const recent = [...counts].reverse().slice(0, 8);

  return (
    <>
      {advice.length > 0 && (
        <Panel
          title="Ajustes sugeridos a tus recetas"
          description="Estas diferencias se repiten en varios conteos. Tú decides si las recetas deben cambiar."
        >
          <ul className="flex flex-col gap-3">
            {advice.map((a) => (
              <li key={a.itemId} className="flex flex-wrap items-center justify-between gap-3">
                <span className="max-w-xl text-[15px]">{a.text}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const r = inventoryActions.calibrate(a.itemId, a.percent);
                    if (!r.ok) return toast.error(r.error);
                    toast.success(`Recetas de ${a.name} ajustadas`);
                  }}
                >
                  Ajustar recetas {a.percent > 0 ? "+" : ""}
                  {Math.round(a.percent * 100)} %<span className="sr-only"> de {a.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Desviaciones"
        description="Lo que faltó o sobró en los conteos frente a lo que el sistema dice que se gastó. Más faltante significa recetas cortas, desperdicio o pérdidas."
      >
        {devs.length === 0 ? (
          <p className="text-muted text-[15px]">
            Cuando registres conteos verás aquí las diferencias por producto.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Desviaciones</caption>
              <thead className="text-muted text-sm">
                <tr>
                  {["Producto", "Conteos", "Faltó", "Se gastó", "Desviación", "Valor"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className={`py-2 pr-4 font-medium ${h === "Producto" ? "" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {devs.map((d) => (
                  <tr key={d.itemId}>
                    <th scope="row" className="py-2.5 pr-4 font-medium">
                      {d.name}
                    </th>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{d.counts}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {fmtQty(d.missing)} {d.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {fmtQty(d.consumed)} {d.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {d.pct === undefined ? "—" : `${Math.round(d.pct * 100)} %`}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {d.value === undefined ? "—" : formatMoney(d.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {recent.length > 0 && (
        <Panel title="Conteos anteriores">
          <ul className="divide-line divide-y">
            {recent.map((c) => {
              const diffs = c.lines.filter((l) => l.diff !== 0);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[15px]"
                >
                  <span>
                    <span className="font-medium">
                      {c.scope === "cierre" ? "Cierre del día" : "Conteo físico"}
                    </span>
                    <span className="text-muted">
                      {" "}
                      · {formatDay(new Date(c.at))} · {formatTime(new Date(c.at))} · {c.by}
                    </span>
                  </span>
                  <span className="text-ink-soft text-sm">
                    {plural(c.lines.length, "producto", "productos")} ·{" "}
                    {diffs.length === 0
                      ? "cuadró"
                      : plural(diffs.length, "con diferencia", "con diferencia")}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
