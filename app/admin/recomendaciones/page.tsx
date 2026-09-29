import type { Metadata } from "next";
import { RecommendationsAdmin } from "@/components/admin/recommendations-admin";

export const metadata: Metadata = { title: "Recomendaciones" };

export default function RecommendationsPage() {
  return <RecommendationsAdmin />;
}
