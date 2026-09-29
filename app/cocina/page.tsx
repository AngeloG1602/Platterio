import type { Metadata, Viewport } from "next";
import { KitchenScreen } from "@/components/kitchen/kitchen-screen";

export const metadata: Metadata = { title: "Cocina" };
export const viewport: Viewport = { themeColor: "#0E0D0C" };

export default function KitchenPage() {
  return <KitchenScreen />;
}
