"use client";

import { Copy, KeyRound } from "lucide-react";
import { useBusinessSlug } from "@/components/providers/business-scope";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useCurrentAccount } from "@/lib/data";
import { Panel } from "./ui/page-header";

/** Cómo entra el personal: el código del negocio y la dirección de la entrada con PIN. */
export function StaffEntryCard() {
  const urlSlug = useBusinessSlug();
  const account = useCurrentAccount();
  const code = urlSlug ?? account?.slug;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  if (!code) return null;
  const link = `${origin}/${code}/entrar`;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No pudimos copiarlo. Selecciónalo y cópialo a mano.");
    }
  }

  return (
    <Panel
      title="Entrada del personal"
      description="Tu equipo no necesita correo: entra con el código del negocio y su PIN personal (los PIN se crean abajo)."
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-muted text-[13px] font-medium">Código del negocio</dt>
          <dd className="mt-1 flex items-center gap-2">
            <code className="bg-surface-2 rounded-lg px-3 py-2 text-[17px] font-semibold">
              {code}
            </code>
            <Button variant="secondary" size="sm" onClick={() => copy(code, "Código")}>
              <Copy aria-hidden /> Copiar<span className="sr-only"> código del negocio</span>
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[13px] font-medium">Enlace directo con tu código</dt>
          <dd className="mt-1 flex items-center gap-2">
            <KeyRound className="text-muted size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[15px]">{link}</span>
            <Button variant="secondary" size="sm" onClick={() => copy(link, "Enlace")}>
              <Copy aria-hidden /> Copiar<span className="sr-only"> enlace de entrada</span>
            </Button>
          </dd>
        </div>
      </dl>
      <p className="text-muted mt-3 text-[13px]">
        También pueden entrar desde la dirección general <b>/personal</b> escribiendo el código.
      </p>
    </Panel>
  );
}
