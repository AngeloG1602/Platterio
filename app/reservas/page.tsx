import type { Metadata } from "next";
import { ReservationScreen } from "@/components/client/reservation-screens";

export const metadata: Metadata = { title: "Reservas" };

export default function ReservationsPage() {
  return <ReservationScreen />;
}
