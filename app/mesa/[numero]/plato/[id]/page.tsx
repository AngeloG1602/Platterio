import type { Metadata } from "next";
import { DishDetailScreen } from "@/components/client/dish-detail";
import { DISHES } from "@/lib/data/catalog";

type Params = Promise<{ numero: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: DISHES.find((d) => d.id === id)?.name ?? "Plato" };
}

export default async function DishPage({ params }: { params: Params }) {
  const { numero, id } = await params;
  return <DishDetailScreen numero={numero} dishId={id} />;
}
