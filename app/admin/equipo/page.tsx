import type { Metadata } from "next";
import { TeamAdmin } from "@/components/admin/team-admin";

export const metadata: Metadata = { title: "Equipo" };

export default function TeamPage() {
  return <TeamAdmin />;
}
