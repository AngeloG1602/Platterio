import type { Metadata } from "next";
import { OrdersAdmin } from "@/components/admin/orders-history";

export const metadata: Metadata = { title: "Pedidos" };

export default function OrdersPage() {
  return <OrdersAdmin />;
}
