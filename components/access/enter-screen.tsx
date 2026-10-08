"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBusinessHref } from "@/components/providers/business-scope";
import { LoginScreen } from "@/components/access/login-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentStaff, useHydrated } from "@/lib/data";
import { HOME } from "@/lib/domain/access";

/** Entrada general del personal: con el PIN lleva a la pantalla de cada rol. */
export function EnterScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const staff = useCurrentStaff();
  const href = useBusinessHref();
  // Si ya había entrado, la sesión de esta pestaña lo lleva directo a su pantalla.
  useEffect(() => {
    if (staff) router.replace(href(HOME[staff.role]));
  }, [staff, router, href]);
  if (!hydrated || staff) return <Skeleton className="mx-auto mt-10 h-96 max-w-md rounded-2xl" />;
  return <LoginScreen onSuccess={(user) => router.push(href(HOME[user.role]))} />;
}
