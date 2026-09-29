import type { Metadata } from "next";
import { RatingScreen } from "@/components/client/rating-screen";

export const metadata: Metadata = { title: "Califica tu experiencia" };

export default async function RatePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return <RatingScreen numero={numero} />;
}
