import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/account/signup-form";

export const metadata: Metadata = {
  title: "Crea tu cuenta",
  description: "Prueba Platterio 7 días gratis, sin tarjeta.",
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
