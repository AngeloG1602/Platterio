import { formatMoney } from "./format";
import type { DeliveryInfo, Dish, Order } from "./types";
import { formatPhone, PAY_WITH_LABEL } from "./delivery";

/**
 * Enlaces y mensajes de WhatsApp para domicilios. Son enlaces `wa.me`: abren WhatsApp en el celular
 * de quien toca el botón con el mensaje ya escrito, y esa persona lo envía (no se manda solo; el
 * envío automático necesita la API de WhatsApp Business, que llega con la base de datos).
 */

/** Prefijo de país de los números (Colombia). */
export const WA_COUNTRY = "57";

/** Número listo para `wa.me` (prefijo + 10 dígitos), o null si no es un celular válido. */
export function waNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^3\d{9}$/.test(digits)) return `${WA_COUNTRY}${digits}`;
  if (digits.length === 12 && digits.startsWith(WA_COUNTRY) && /^3\d{9}$/.test(digits.slice(2)))
    return digits;
  return null;
}

export function waLink(phone: string, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function telLink(phone: string): string | null {
  const n = waNumber(phone);
  return n ? `tel:+${n}` : null;
}

export function mapsLink(info: Pick<DeliveryInfo, "address" | "zoneName">): string | null {
  const query = [info.address, info.zoneName].filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

/** Líneas del pedido en texto: "2× Clásica 27 (Doble) · SIN Cebolla · Nota: bien cocida". */
export function orderLines(order: Pick<Order, "items">, dishes: readonly Dish[]): string[] {
  return order.items
    .filter((l) => !l.removed)
    .map((l) => {
      const dish = dishes.find((d) => d.id === l.dishId);
      const variant = dish?.variants.find((v) => v.id === l.variantId);
      const parts = [
        `${l.qty}× ${dish?.name ?? "Plato"}${dish && dish.variants.length > 1 && variant ? ` (${variant.name})` : ""}`,
        ...(l.custom?.kitchen ?? []),
        ...(l.note ? [`Nota: ${l.note}`] : []),
      ];
      return parts.join(" · ");
    });
}

const kind = (info: Pick<DeliveryInfo, "type">) =>
  info.type === "recoger" ? "para recoger" : "a domicilio";

function payText(info: DeliveryInfo, total: number): string {
  const base = PAY_WITH_LABEL[info.payWith];
  return info.cashFor
    ? `${base} (paga con ${formatMoney(info.cashFor)}, cambio ${formatMoney(Math.max(0, info.cashFor - total))})`
    : base;
}

/** Lo que el cliente le escribe al negocio con su pedido. */
export function messageToBusiness(p: {
  restaurant: string;
  info: DeliveryInfo;
  lines: readonly string[];
  total: number;
}): string {
  const { info } = p;
  return [
    `Hola, hice un pedido ${kind(info)} en ${p.restaurant}.`,
    `*Pedido ${info.code}*`,
    ...p.lines.map((l) => `• ${l}`),
    `Total: ${formatMoney(p.total)}${info.fee > 0 ? ` (con envío de ${formatMoney(info.fee)})` : ""}`,
    `Pago: ${payText(info, p.total)}`,
    `Nombre: ${info.customerName}`,
    `Celular: ${formatPhone(info.phone)}`,
    ...(info.type === "domicilio"
      ? [
          `Dirección: ${info.address ?? ""}${info.zoneName ? ` (${info.zoneName})` : ""}`,
          ...(info.reference ? [`Referencia: ${info.reference}`] : []),
        ]
      : []),
    ...(info.note ? [`Nota: ${info.note}`] : []),
  ].join("\n");
}

/** Lo que Caja le escribe al domiciliario: a dónde ir, a quién y cuánto cobrar. */
export function messageToDriver(p: {
  restaurant: string;
  driver: string;
  info: DeliveryInfo;
  lines: readonly string[];
  total: number;
  /** Lo que falta por cobrar (0 si ya está pago). */
  pending: number;
}): string {
  const { info } = p;
  const map = mapsLink(info);
  return [
    `Hola ${p.driver}, domicilio *${info.code}* de ${p.restaurant}.`,
    `Cliente: ${info.customerName} · ${formatPhone(info.phone)}`,
    `Dirección: ${info.address ?? ""}${info.zoneName ? ` (${info.zoneName})` : ""}`,
    ...(info.reference ? [`Referencia: ${info.reference}`] : []),
    ...(map ? [`Mapa: ${map}`] : []),
    p.pending > 0
      ? `Cobrar: ${formatMoney(p.pending)} · ${payText(info, p.pending)}`
      : "Cobrar: nada, ya está pago",
    "Pedido:",
    ...p.lines.map((l) => `• ${l}`),
    ...(info.note ? [`Nota: ${info.note}`] : []),
  ].join("\n");
}

/** Lo que el cliente le escribe al domiciliario que lleva su pedido. */
export function messageCustomerToDriver(p: {
  restaurant: string;
  driver: string;
  info: Pick<DeliveryInfo, "code" | "customerName">;
}): string {
  return `Hola ${p.driver}, soy ${p.info.customerName}, del pedido ${p.info.code} de ${p.restaurant}.`;
}
