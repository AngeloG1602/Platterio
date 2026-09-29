import type { CartItem, Dish } from "./types";

export type NewCartItem = Omit<CartItem, "id">;

function sameLine(a: NewCartItem, b: NewCartItem): boolean {
  return (
    a.dishId === b.dishId &&
    a.variantId === b.variantId &&
    a.dinerId === b.dinerId &&
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

export function cartCount(cart: readonly CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotal(cart: readonly CartItem[], dishes: readonly Dish[]): number {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return cart.reduce((sum, i) => sum + unitPrice(byId.get(i.dishId), i.variantId) * i.qty, 0);
}
