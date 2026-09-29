"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { PlatterioMark } from "@/components/brand/logos";
import { Button, buttonClasses } from "@/components/ui/button";

/** Error inesperado en una pantalla: mensaje claro y dos salidas. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <PlatterioMark className="text-line-strong size-14" />
      <h1 className="font-display mt-6 text-[32px] leading-tight font-semibold">
        Algo se nos quemó en la cocina
      </h1>
      <p className="text-ink-soft mt-3 max-w-sm text-[16px] leading-relaxed">
        Hubo un error inesperado al mostrar esta pantalla. Inténtalo de nuevo; tus datos siguen
        guardados.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden /> Reintentar
        </Button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
