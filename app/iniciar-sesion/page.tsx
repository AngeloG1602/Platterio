import type { Metadata } from "next";
import { SigninForm } from "@/components/account/signin-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SigninPage() {
  return <SigninForm />;
}
