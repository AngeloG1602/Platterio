"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

/** Toasts con los tokens de la marca (sin el aspecto por defecto de sonner). */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      mobileOffset={12}
      gap={8}
      duration={3500}
      icons={{
        success: <CircleCheck className="text-success size-5" aria-hidden />,
        error: <CircleAlert className="text-danger size-5" aria-hidden />,
        warning: <TriangleAlert className="text-warning size-5" aria-hidden />,
        info: <Info className="text-ink-soft size-5" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-ink shadow-float font-sans",
          title: "text-[15px] font-semibold leading-snug",
          description: "mt-0.5 text-sm text-muted leading-snug",
          icon: "mt-0.5 shrink-0",
          actionButton:
            "ml-auto shrink-0 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-bg",
        },
      }}
    />
  );
}
