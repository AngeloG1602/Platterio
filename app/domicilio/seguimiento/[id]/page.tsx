import type { Metadata } from "next";
import { TrackingScreen } from "@/components/delivery/tracking-screen";

export const metadata: Metadata = { title: "Seguimiento del pedido" };

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackingScreen id={id} />;
}
