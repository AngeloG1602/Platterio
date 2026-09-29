import type { Metadata } from "next";
import { WaiterScreen } from "@/components/waiter/waiter-screen";

export const metadata: Metadata = { title: "Mesero" };

export default function WaiterPage() {
  return <WaiterScreen />;
}
