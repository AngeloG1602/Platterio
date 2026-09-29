import type { Metadata } from "next";
import { RatingsAdmin } from "@/components/admin/ratings-admin";

export const metadata: Metadata = { title: "Calificaciones" };

export default function RatingsPage() {
  return <RatingsAdmin />;
}
