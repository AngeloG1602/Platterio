import type { Metadata } from "next";
import { OrderScreen } from "@/components/client/order-screen";

export const metadata: Metadata = { title: "Pedido de la mesa" };

export default async function OrderPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return <OrderScreen numero={numero} />;
}
