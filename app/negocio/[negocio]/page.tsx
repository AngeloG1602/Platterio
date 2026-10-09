import type { Metadata } from "next";
import { BusinessHome } from "@/components/client/business-home";

export const metadata: Metadata = { title: "Inicio" };

export default async function BusinessHomePage({
  params,
}: {
  params: Promise<{ negocio: string }>;
}) {
  const { negocio } = await params;
  return <BusinessHome slug={negocio} />;
}
