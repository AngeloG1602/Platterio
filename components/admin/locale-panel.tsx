"use client";

import { Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { localeActions, useRestaurant } from "@/lib/data";
import { CURRENCIES, CURRENCY_CODES, formatMoney, isCurrency } from "@/lib/domain/format";
import { enabledLangs } from "@/lib/i18n";
import { Panel } from "./ui/page-header";

/** Idioma de la carta del cliente y moneda de los precios. */
export function LocalePanel() {
  const restaurant = useRestaurant();
  const english = enabledLangs(restaurant.languages).includes("en");
  const currency = isCurrency(restaurant.currency) ? restaurant.currency : "COP";
  return (
    <Panel
      title="Idioma y moneda"
      description="Lo que ve el cliente en su celular. El panel del personal siempre está en español."
    >
      <div className="flex flex-col gap-5">
        <Switch
          label="Ofrecer la carta en inglés"
          description="El cliente elige entre español e inglés, o se usa el idioma de su celular. Los platos se traducen con el campo de inglés de cada plato."
          checked={english}
          onChange={(on) => {
            localeActions.setLanguages(on ? ["es", "en"] : ["es"]);
            toast.success(on ? "Carta en español e inglés" : "Carta solo en español");
          }}
        />
        <div>
          <label htmlFor="moneda" className="mb-1.5 block text-sm font-medium">
            Moneda de los precios
          </label>
          <Select
            id="moneda"
            className="max-w-sm"
            value={currency}
            onChange={(e) => {
              const r = localeActions.setCurrency(e.target.value);
              if (!r.ok) return toast.error(r.error);
              toast.success("Moneda actualizada");
            }}
          >
            {CURRENCY_CODES.map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].label} ({c})
              </option>
            ))}
          </Select>
          <p className="text-muted mt-2 text-[13px]">
            Así se ve un precio:{" "}
            <span className="text-ink font-semibold">{formatMoney(12500, currency)}</span>. Cambiar
            la moneda <strong>no convierte</strong> los precios que ya escribiste: revisa tu carta.
            Los precios van en unidades enteras, sin centavos.
          </p>
        </div>
      </div>
    </Panel>
  );
}
