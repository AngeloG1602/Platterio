import type { ReactNode } from "react";
import { DemoPanel } from "@/components/demo/demo-panel";
import { cn } from "@/lib/cn";

/**
 * Contenedor de la vista del cliente: columna de celular (hasta 448 px). En pantallas anchas
 * queda centrada sobre un fondo más oscuro, como un teléfono sobre la mesa.
 */
export function ClientShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="bg-bg sm:bg-surface-2 min-h-dvh">
      <div
        className={cn(
          "bg-bg sm:border-line sm:shadow-card animate-fade-in relative mx-auto flex min-h-dvh w-full max-w-md flex-col sm:border-x",
          className,
        )}
      >
        {children}
      </div>
      <DemoPanel />
    </div>
  );
}
