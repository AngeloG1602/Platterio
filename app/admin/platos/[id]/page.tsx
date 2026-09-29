import type { Metadata } from "next";
import { DishEditorScreen } from "@/components/admin/dishes/dish-editor";

export const metadata: Metadata = { title: "Plato" };

export default async function DishEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DishEditorScreen id={id} />;
}
