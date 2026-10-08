import type { Metadata } from "next";
import { DeliveryMenu } from "@/components/delivery/delivery-menu";

export const metadata: Metadata = { title: "Pide a domicilio" };

export default function DeliveryPage() {
  return <DeliveryMenu />;
}
