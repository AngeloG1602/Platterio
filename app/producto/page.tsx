import type { Metadata } from "next";
import { SalesPage } from "@/components/sales/sales-page";

export const metadata: Metadata = {
  title: { absolute: "Platterio · La carta, el salón y la caja de tu restaurante" },
  description:
    "Carta digital con QR por mesa, pedidos desde el celular, cocina, caja, domicilios, reportes y vista 3D de tus platos. Pruébalo 7 días.",
};

export default function ProductPage() {
  return <SalesPage />;
}
