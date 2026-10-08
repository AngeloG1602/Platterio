import { t } from "@/lib/i18n";
import type { CartItem, Dish } from "./types";

export type NewCartItem = Omit<CartItem, "id">;

function sameLine(a: NewCartItem, b: NewCartItem): boolean {
  return (
    a.dishId === b.dishId &&
    a.variantId === b.variantId &&
    a.dinerId === b.dinerId &&
    JSON.stringify(a.custom?.choices ?? null) === JSON.stringify(b.custom?.choices ?? null) &&
    (a.note?.trim() ?? "") === (b.note?.trim() ?? "")
  );
}

/** Agrega al carrito compartido. Si el mismo comensal ya tiene esa línea (plato, variante y nota), suma la cantidad. */
export function addToCart(cart: readonly CartItem[], item: NewCartItem, id: string): CartItem[] {
  const note = item.note?.trim() || undefined;
  const clean: NewCartItem = { ...item, note };
  if (!note) delete clean.note;
  const existing = cart.find((c) => sameLine(c, clean));
  if (existing) return cart.map((c) => (c === existing ? { ...c, qty: c.qty + clean.qty } : c));
  return [...cart, { ...clean, id }];
}

export function unitPrice(dish: Dish | undefined, variantId: string): number {
  return dish?.variants.find((v) => v.id === variantId)?.price ?? 0;
}

/** Precio de una unidad de la línea: el de la opción más lo que sume su personalización. */
export function itemUnitPrice(
  item: Pick<CartItem, "variantId" | "custom">,
  dish: Dish | undefined,
): number {
  return unitPrice(dish, item.variantId) + (item.custom?.priceDelta ?? 0);
}

export function cartCount(cart: readonly CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotal(cart: readonly CartItem[], dishes: readonly Dish[]): number {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return cart.reduce((sum, i) => sum + itemUnitPrice(i, byId.get(i.dishId)) * i.qty, 0);
}

export type CartError = { ok: false; error: string };
export type CartResult = { ok: true; cart: CartItem[] } | CartError;

/** Cambia cantidad o variante de un ítem. Solo su dueño puede hacerlo (US-23). */
export function updateCartItem(
  cart: readonly CartItem[],
  itemId: string,
  dinerId: string,
  patch: { qty?: number; variantId?: string },
): CartResult {
  const item = cart.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Este plato ya no está en el carrito" };
  if (item.dinerId !== dinerId)
    return { ok: false, error: "Solo puedes cambiar lo que agregaste tú" };
  if (item.custom && patch.variantId && patch.variantId !== item.variantId)
    return {
      ok: false,
      error: t(
        "Este plato está personalizado. Quítalo y personalízalo de nuevo para cambiar la opción.",
      ),
    };
  const qty = patch.qty ?? item.qty;
  if (!Number.isInteger(qty) || qty < 1 || qty > 20)
    return { ok: false, error: "La cantidad va de 1 a 20" };
  return {
    ok: true,
    cart: cart.map((c) =>
      c.id === itemId ? { ...c, qty, variantId: patch.variantId ?? c.variantId } : c,
    ),
  };
}

export function removeCartItem(
  cart: readonly CartItem[],
  itemId: string,
  dinerId: string,
): CartResult {
  const item = cart.find((c) => c.id === itemId);
  if (!item) return { ok: false, error: "Este plato ya no está en el carrito" };
  if (item.dinerId !== dinerId)
    return { ok: false, error: "Solo puedes quitar lo que agregaste tú" };
  return { ok: true, cart: cart.filter((c) => c.id !== itemId) };
}

/** Platos por comensal, en el orden en que entraron a la mesa: "Ana 2 · Luis 1". */
export function countByDiner(
  cart: readonly CartItem[],
  diners: ReadonlyArray<{ id: string; alias: string }>,
): Array<{ dinerId: string; alias: string; count: number }> {
  return diners
    .map((d) => ({
      dinerId: d.id,
      alias: d.alias,
      count: cartCount(cart.filter((c) => c.dinerId === d.id)),
    }))
    .filter((x) => x.count > 0);
}
