import type { Metadata } from "next";
import { CheckoutScreen } from "@/components/delivery/checkout-screen";

export const metadata: Metadata = { title: "Tu pedido a domicilio" };

export default function CheckoutPage() {
  return <CheckoutScreen />;
}
