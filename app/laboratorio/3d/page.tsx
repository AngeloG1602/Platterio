import type { Metadata } from "next";
import { Lab3D } from "@/components/lab/lab-3d";

export const metadata: Metadata = {
  title: "Laboratorio 3D",
  robots: { index: false, follow: false },
};

export default function Lab3DPage() {
  return <Lab3D />;
}
