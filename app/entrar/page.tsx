import type { Metadata } from "next";
import { EnterScreen } from "@/components/access/enter-screen";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function EnterPage() {
  return <EnterScreen />;
}
