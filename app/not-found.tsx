import Link from "next/link";
import { PlatterioMark } from "@/components/brand/logos";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <PlatterioMark className="text-line-strong size-14" />
      <p className="text-accent-strong mt-6 text-sm font-semibold tracking-[0.16em] uppercase">
        Error 404
      </p>
      <h1 className="font-display mt-2 text-[34px] leading-tight font-semibold">
        Esta página no está en la carta
      </h1>
      <p className="text-ink-soft mt-3 max-w-sm text-[16px] leading-relaxed">
        Puede que el enlace esté mal escrito o que la página ya no exista. Si escaneaste un QR,
        pídele ayuda al mesero.
      </p>
      <Link href="/" className={buttonClasses({ className: "mt-8" })}>
        Ir al inicio de la demo
      </Link>
    </main>
  );
}
