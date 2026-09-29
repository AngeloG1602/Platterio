import type { Metadata } from "next";
import { TableEntry } from "@/components/client/table-entry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ numero: string }>;
}): Promise<Metadata> {
  const { numero } = await params;
  return { title: `Mesa ${numero}` };
}

export default async function TablePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return <TableEntry numero={numero} />;
}
