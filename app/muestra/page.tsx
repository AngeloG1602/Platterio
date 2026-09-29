import type { Metadata } from "next";
import { Showcase } from "@/components/showcase/showcase";

export const metadata: Metadata = { title: "Componentes" };

export default function ShowcasePage() {
  return <Showcase />;
}
