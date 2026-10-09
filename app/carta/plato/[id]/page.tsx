import type { Metadata } from "next";
import { PublicDishDetailScreen } from "@/components/client/dish-detail";
import { DISHES } from "@/lib/data/catalog";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: DISHES.find((d) => d.id === id)?.name ?? "Plato" };
}

export default async function PublicDishPage({ params }: { params: Params }) {
  const { id } = await params;
  return <PublicDishDetailScreen dishId={id} />;
}
