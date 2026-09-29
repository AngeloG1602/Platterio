import type { Metadata } from "next";
import { CartScreen } from "@/components/client/cart-screen";

export const metadata: Metadata = { title: "Carrito de la mesa" };

export default async function CartPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return <CartScreen numero={numero} />;
}
