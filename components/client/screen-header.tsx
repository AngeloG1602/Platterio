"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/button";

/** Encabezado de las pantallas internas de la mesa: volver, título y un extra opcional. */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref: string;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="border-line bg-bg/92 sticky top-0 z-20 flex items-center gap-2 border-b px-2 py-2 backdrop-blur-md">
      <IconButton label="Volver a la carta" onClick={() => router.push(backHref)}>
        <ArrowLeft aria-hidden />
      </IconButton>
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-[20px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="text-muted truncate text-[13px]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function LiveDot({ label = "En vivo" }: { label?: string }) {
  return (
    <span className="text-success-ink inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className="relative flex size-2" aria-hidden>
        <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60" />
        <span className="bg-success relative inline-flex size-2 rounded-full" />
      </span>
      {label}
    </span>
  );
}
