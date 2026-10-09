import type { Metadata } from "next";
import { PublicMenuScreen } from "@/components/client/menu-screen";

export const metadata: Metadata = { title: "Carta" };

export default function PublicMenuPage() {
  return <PublicMenuScreen />;
}
