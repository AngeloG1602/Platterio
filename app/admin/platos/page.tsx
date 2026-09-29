import type { Metadata } from "next";
import { DishList } from "@/components/admin/dishes/dish-list";

export const metadata: Metadata = { title: "Platos" };

export default function DishesPage() {
  return <DishList />;
}
