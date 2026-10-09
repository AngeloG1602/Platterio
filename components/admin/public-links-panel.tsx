"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { useBusinessHref, useBusinessSlug } from "@/components/providers/business-scope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { toast } from "@/components/ui/toaster";
import { useCurrentAccount, useDeliveryConfig, useRestaurant } from "@/lib/data";
import { strongVariant } from "@/lib/domain/color";
import { withBusiness } from "@/lib/domain/routes";
import { Panel } from "./ui/page-header";

/**
 * Enlaces que el negocio comparte con sus clientes: la página de inicio del negocio (un solo
 * enlace para Instagram, WhatsApp o Google Maps), la carta para mirar y los domicilios. Ninguno
 * pide usuario ni PIN.
 */
export function PublicLinksPanel() {
  const href = useBusinessHref();
  const urlSlug = useBusinessSlug();
  const account = useCurrentAccount();
  const restaurant = useRestaurant();
  const delivery = useDeliveryConfig();
  const holder = useRef<HTMLDivElement>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const slug = urlSlug ?? account?.slug ?? null;
  const enabled = Boolean(delivery?.enabled);

  // Con negocio, el enlace principal es su página de inicio; en la demo no hay (se entra por /demo).
  const main = slug ? `${origin}/${slug}` : `${origin}${href("/carta")}`;
  const rows = [
    ...(slug
      ? [
          {
            key: "inicio",
            title: "Enlace de tu negocio",
            note: "El único que necesitas compartir: lleva a la carta y a los domicilios.",
            path: `/${slug}`,
          },
        ]
      : []),
    {
      key: "carta",
      title: "Solo la carta",
      note: "Para quien quiere ver qué ofreces y los precios antes de ir.",
      path: withBusiness(slug, "/carta"),
    },
    {
      key: "domicilio",
      title: "Domicilios y para recoger",
      note: "Los pedidos llegan a Caja.",
      path: withBusiness(slug, "/domicilio"),
      badge: (
        <Badge tone={enabled ? "success" : "warning"}>
          {enabled ? "Recibiendo pedidos" : "Desactivado"}
        </Badge>
      ),
    },
  ];

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No pudimos copiarlo. Selecciónalo y cópialo a mano.");
    }
  }

  function download() {
    const qr = holder.current?.querySelector("canvas");
    if (!qr) return;
    const card = document.createElement("canvas");
    card.width = 600;
    card.height = 780;
    const ctx = card.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, card.width, card.height);
    ctx.fillStyle = "#1C1917";
    ctx.textAlign = "center";
    ctx.font = "600 40px 'Fraunces Variable', Georgia, serif";
    ctx.fillText(restaurant.name, 300, 80);
    ctx.fillStyle = strongVariant(restaurant.accentColor);
    ctx.font = "700 48px 'Inter Variable', sans-serif";
    ctx.fillText(slug ? "Mira nuestra carta" : "Nuestra carta", 300, 160);
    ctx.drawImage(qr, 100, 200, 400, 400);
    ctx.fillStyle = "#44403C";
    ctx.font = "500 26px 'Inter Variable', sans-serif";
    ctx.fillText("Escanea para ver la carta o pedir", 300, 660);
    ctx.fillStyle = "#716A64";
    ctx.font = "400 20px 'Inter Variable', sans-serif";
    ctx.fillText("Hecho con Platterio", 300, 730);
    const a = document.createElement("a");
    a.href = card.toDataURL("image/png");
    a.download = "qr-carta.png";
    a.click();
  }

  return (
    <Panel
      title="Tus enlaces públicos"
      description="Lo que compartes con tus clientes. No piden usuario ni PIN para mirar la carta ni para pedir a domicilio."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <div key={r.key} className={i === 0 ? "" : "border-line border-t pt-4"}>
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {r.title}
                {r.badge}
              </p>
              <p className="text-muted mt-0.5 text-[13px]">{r.note}</p>
              <p className="bg-surface-2 mt-2 truncate rounded-lg px-3 py-2 text-[15px]">
                {origin}
                {r.path}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => copy(r.path)}>
                  <Copy aria-hidden /> Copiar enlace
                  <span className="sr-only"> de {r.title.toLowerCase()}</span>
                </Button>
                <a
                  href={r.path}
                  target="_blank"
                  rel="noreferrer"
                  className="border-line-strong hover:bg-surface-2 text-ink inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
                >
                  <ExternalLink className="size-4" aria-hidden /> Abrir
                  <span className="sr-only"> {r.title.toLowerCase()} en otra pestaña</span>
                </a>
              </div>
              {r.key === "domicilio" && (
                <p className="text-muted mt-2 text-[13px]">
                  {enabled
                    ? "Zonas, tarifas y horario: "
                    : "Hoy tus clientes ven que no recibes pedidos. "}
                  <a
                    href={`${href("/admin/configuracion")}#domicilios`}
                    className="text-accent-strong font-semibold underline"
                  >
                    {enabled ? "Domicilios y recogida" : "Actívalos y configura zonas y horario"}
                  </a>
                  .
                </p>
              )}
            </div>
          ))}
          <p className="border-line text-muted border-t pt-4 text-[13px]">
            Cada mesa tiene además su propio QR para imprimir:{" "}
            <a
              href={`${href("/admin/configuracion")}#mesas`}
              className="text-accent-strong font-semibold underline"
            >
              ver los QR de las mesas
            </a>
            .{!slug && " Crea tu cuenta para tener la dirección propia de tu negocio."}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-white p-2">
            {origin ? (
              <QRCodeSVG
                value={main}
                size={132}
                level="M"
                role="img"
                aria-label={slug ? "Código QR del enlace de tu negocio" : "Código QR de la carta"}
              />
            ) : (
              <div className="size-[132px]" />
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={download} disabled={!origin}>
            <Download aria-hidden /> Descargar QR
          </Button>
          <div ref={holder} className="hidden" aria-hidden>
            {origin && <QRCodeCanvas value={main} size={400} level="M" marginSize={1} />}
          </div>
        </div>
      </div>
    </Panel>
  );
}
