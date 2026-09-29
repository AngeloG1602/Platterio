import type { Metadata } from "next";
import { MenuScreen } from "@/components/client/menu-screen";

export const metadata: Metadata = { title: "Carta" };

export default async function MenuPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return <MenuScreen numero={numero} />;
}
