"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { useBusinessHref } from "@/components/providers/business-scope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { toast } from "@/components/ui/toaster";
import { useDeliveryConfig, useRestaurant } from "@/lib/data";
import { strongVariant } from "@/lib/domain/color";
import { Panel } from "./ui/page-header";

/**
 * Enlaces que el negocio comparte con sus clientes: la carta de domicilios y para recoger (pública,
 * sin PIN) y el recordatorio de los QR de las mesas.
 */
export function PublicLinksPanel() {
  const href = useBusinessHref();
  const restaurant = useRestaurant();
  const delivery = useDeliveryConfig();
  const holder = useRef<HTMLDivElement>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}${href("/domicilio")}`;
  const enabled = Boolean(delivery?.enabled);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
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
    ctx.font = "700 52px 'Inter Variable', sans-serif";
    ctx.fillText("Pide a domicilio", 300, 160);
    ctx.drawImage(qr, 100, 200, 400, 400);
    ctx.fillStyle = "#44403C";
    ctx.font = "500 26px 'Inter Variable', sans-serif";
    ctx.fillText("Escanea y pide para recoger o a tu casa", 300, 660);
    ctx.fillStyle = "#716A64";
    ctx.font = "400 20px 'Inter Variable', sans-serif";
    ctx.fillText("Hecho con Platterio", 300, 730);
    const a = document.createElement("a");
    a.href = card.toDataURL("image/png");
    a.download = "qr-domicilios.png";
    a.click();
  }

  return (
    <Panel
      title="Tus enlaces públicos"
      description="Lo que compartes con tus clientes. No piden usuario ni PIN para mirar la carta y pedir."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
              Pedidos a domicilio y para recoger
              <Badge tone={enabled ? "success" : "warning"}>
                {enabled ? "Recibiendo pedidos" : "Desactivado"}
              </Badge>
            </p>
            <p className="text-muted mt-0.5 text-[13px]">
              Ponlo en tu Instagram, WhatsApp o Google Maps. Los pedidos llegan a Caja.
            </p>
            <p className="bg-surface-2 mt-2 truncate rounded-lg px-3 py-2 text-[15px]">
              {link || href("/domicilio")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={copy}>
                <Copy aria-hidden /> Copiar enlace
              </Button>
              <a
                href={href("/domicilio")}
                target="_blank"
                rel="noreferrer"
                className="border-line-strong hover:bg-surface-2 text-ink inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
              >
                <ExternalLink className="size-4" aria-hidden /> Abrir
                <span className="sr-only"> la carta de domicilios en otra pestaña</span>
              </a>
              <Button variant="secondary" size="sm" onClick={download} disabled={!origin}>
                <Download aria-hidden /> Descargar QR
              </Button>
            </div>
            {!enabled && (
              <p className="text-warning-ink mt-3 text-[14px]">
                Hoy tus clientes ven que no recibes pedidos.{" "}
                <a
                  href={`${href("/admin/configuracion")}#domicilios`}
                  className="font-semibold underline"
                >
                  Actívalos y configura zonas y horario
                </a>
                .
              </p>
            )}
            {enabled && (
              <p className="text-muted mt-3 text-[13px]">
                Zonas, tarifas y horario:{" "}
                <a
                  href={`${href("/admin/configuracion")}#domicilios`}
                  className="text-accent-strong font-semibold underline"
                >
                  Domicilios y recogida
                </a>
                .
              </p>
            )}
          </div>
          <div className="border-line border-t pt-4">
            <p className="text-[15px] font-semibold">Carta de cada mesa</p>
            <p className="text-muted mt-0.5 text-[13px]">
              Cada mesa tiene su propio QR para imprimir.{" "}
              <a
                href={`${href("/admin/configuracion")}#mesas`}
                className="text-accent-strong font-semibold underline"
              >
                Ver los QR de las mesas
              </a>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg bg-white p-2">
            {origin ? (
              <QRCodeSVG
                value={link}
                size={132}
                level="M"
                role="img"
                aria-label="Código QR de la carta de domicilios"
              />
            ) : (
              <div className="size-[132px]" />
            )}
          </div>
          <div ref={holder} className="hidden" aria-hidden>
            {origin && <QRCodeCanvas value={link} size={400} level="M" marginSize={1} />}
          </div>
        </div>
      </div>
    </Panel>
  );
}
