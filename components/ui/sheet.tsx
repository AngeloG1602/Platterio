"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

/** Hoja inferior (bottom sheet) para móvil; en pantallas anchas se centra con ancho máximo. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (dismissible || o ? onOpenChange(o) : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-overlay data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in fixed inset-0 z-50 backdrop-blur-[2px]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          onInteractOutside={(e) => !dismissible && e.preventDefault()}
          onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col",
            "bg-surface shadow-sheet rounded-t-2xl outline-none",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
          )}
        >
          <div
            className="bg-line-strong mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-1">
            <div>
              <Dialog.Title className="font-display text-[22px] leading-tight font-semibold">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-muted mt-1 text-[15px]">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            {dismissible && (
              <Dialog.Close
                aria-label={t("Cerrar")}
                className="text-muted hover:bg-surface-2 hover:text-ink -mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer && <div className="border-line pb-safe border-t px-5 pt-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
