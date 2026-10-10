import type { Metadata } from "next";
import { ReservationStatusScreen } from "@/components/client/reservation-screens";

export const metadata: Metadata = { title: "Tu reserva", robots: { index: false } };

export default async function ReservationStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReservationStatusScreen id={id} />;
}
