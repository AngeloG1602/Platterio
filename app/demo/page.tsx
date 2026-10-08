import type { Metadata } from "next";
import { Hub } from "@/components/hub/hub";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  return <Hub />;
}
