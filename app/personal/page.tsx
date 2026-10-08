import type { Metadata } from "next";
import { PersonalEntry } from "@/components/access/personal-entry";

export const metadata: Metadata = { title: "Entrada del personal", robots: { index: false } };

export default function PersonalPage() {
  return <PersonalEntry />;
}
