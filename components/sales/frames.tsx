import Image from "next/image";
import { cn } from "@/lib/cn";

/** Celular con una captura real de la app dentro. */
export function Phone({
  src,
  alt,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 260px, 60vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "bg-ink relative aspect-[9/19] w-full overflow-hidden rounded-[2.2rem] border-[7px] border-[#1c1917] shadow-[0_30px_60px_-20px_rgba(28,25,23,0.45)]",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="rounded-[1.7rem] object-cover object-top"
      />
    </div>
  );
}

/** Ventana de navegador (tablet o computador) con una captura real de la app. */
export function Screen({
  src,
  alt,
  className,
  ratio = "aspect-[16/10]",
  priority = false,
  sizes = "(min-width: 1024px) 560px, 92vw",
}: {
  src: string;
  alt: string;
  className?: string;
  ratio?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "border-line bg-surface overflow-hidden rounded-2xl border shadow-[0_30px_60px_-24px_rgba(28,25,23,0.35)]",
        className,
      )}
    >
      <div
        className="bg-surface-2 border-line flex items-center gap-1.5 border-b px-4 py-2.5"
        aria-hidden
      >
        <span className="bg-line-strong size-2.5 rounded-full" />
        <span className="bg-line-strong size-2.5 rounded-full" />
        <span className="bg-line-strong size-2.5 rounded-full" />
      </div>
      <div className={cn("relative w-full", ratio)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
