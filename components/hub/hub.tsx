"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  ChefHat,
  ConciergeBell,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Monitor,
  Palette,
  ScanQrCode,
  Smartphone,
  Store,
  Tablet,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PlatterioLogo, RestaurantMark } from "@/components/brand/logos";
import { DemoPanel, openDemoPanel } from "@/components/demo/demo-panel";
import { buttonClasses, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  authActions,
  useAlerts,
  useConnectedTabs,
  useCurrentSlot,
  useDemoSettings,
  useHistory,
  useHydrated,
  useNow,
  useRestaurant,
  useTables,
  useWaiters,
} from "@/lib/data";
import { formatDay, formatTime, plural } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

const SCRIPT = [
  "En el panel de demo, pon la hora en Almuerzo.",
  "Pestaña A: entra a la Mesa 3 como “Ana” con alergia a lácteos. Mira cómo cambian los recomendados y el aviso en la Clásica 27.",
  "Pestaña B: entra a la Mesa 3 como “Luis”. Agreguen platos y vean el carrito compartido en vivo. Luis envía el pedido.",
  "Pestaña C (Mesero Carlos): entra con su PIN o con el atajo de la demo. Llega el ticket: quita un ítem por “Agotado” y confirma.",
  "Pestaña D (Cocina): pasa el pedido a “En preparación” y luego a “Listo”. El mesero lo marca como entregado.",
  "En el cliente: califica los platos y dale 2 estrellas al servicio.",
  "Pestaña E (Admin): aparece la alerta de servicio bajo. Crea un plato, destácalo y míralo de primero en los recomendados.",
  "Cierra con “Ver en 3D”: en la Clásica 27 quita la cebolla y pide queso extra; el precio, la cocina y el mesero lo reflejan.",
];

export function Hub() {
  const hydrated = useHydrated();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <PlatterioLogo />
        <div className="flex items-center gap-2">
          <Link
            href="/producto"
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "hidden sm:inline-flex",
            })}
          >
            <Store aria-hidden /> Página de ventas
          </Link>
          <Link
            href="/muestra"
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "hidden sm:inline-flex",
            })}
          >
            <Palette aria-hidden /> Componentes
          </Link>
          <Link href="/entrar" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <KeyRound aria-hidden /> Entrar con PIN
          </Link>
          <Button variant="secondary" size="sm" onClick={openDemoPanel}>
            <WandSparkles aria-hidden /> Panel de demo
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <section className="grid gap-6 pt-4 pb-10 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-12 lg:pt-10">
          <div>
            <p className="text-accent-strong mb-4 text-xs font-semibold tracking-[0.16em] uppercase">
              Demo navegable · Restaurante de ejemplo
            </p>
            <h1 className="font-display text-ink text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-[56px]">
              La carta de un buen restaurante, en el celular de cada mesa.
            </h1>
            <p className="text-ink-soft mt-5 max-w-xl text-[17px] leading-relaxed">
              Abre cada vista en una pestaña distinta: lo que pasa en una aparece al instante en las
              demás. Todos los datos son de prueba.
            </p>
          </div>
          {hydrated ? <DemoStatus /> : <Skeleton className="h-64 rounded-2xl" />}
        </section>

        <h2 className="sr-only">Entra como</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ClientCard />
          <RoleCard
            icon={Bike}
            device={Smartphone}
            deviceLabel="Celular del cliente"
            title="Domicilios"
            description="El cliente pide desde su casa a domicilio o para recoger, y sigue su pedido hasta la puerta. El encargado lo gestiona en Caja."
            href="/domicilio"
          />
          <RoleCard
            icon={ConciergeBell}
            device={Tablet}
            deviceLabel="Tablet o celular"
            title="Mesero"
            description="Recibe los pedidos de sus mesas, los ajusta si hace falta y los confirma antes de que lleguen a la cocina."
            href="/mesero"
            extra={<WaiterList />}
          />
          <RoleCard
            icon={ChefHat}
            device={Tablet}
            deviceLabel="Tablet horizontal"
            title="Cocina"
            description="Tablero oscuro y de letra grande: confirmados, en preparación y listos, en orden de llegada."
            href="/cocina"
            dark
          />
          <RoleCard
            icon={Landmark}
            device={Tablet}
            deviceLabel="Tablet o escritorio"
            title="Encargado de caja"
            description="Opera todo el salón, asigna mesas, administra al equipo de servicio y cobra. Sin el panel completo del administrador."
            href="/caja"
          />
          <RoleCard
            icon={LayoutDashboard}
            device={Monitor}
            deviceLabel="Escritorio"
            title="Administrador"
            description="Ventas, calificaciones y alertas de servicio; catálogo, recomendaciones, mesas, QR y equipo."
            href="/admin"
          />
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-accent-strong mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
              Para la sustentación
            </p>
            <h2 className="font-display text-3xl leading-tight font-semibold">
              Guion de 5 minutos
            </h2>
            <p className="text-muted mt-3 max-w-sm text-[15px] leading-relaxed">
              El recorrido completo, de escanear el QR a la alerta en el panel. Usa cinco pestañas
              del mismo navegador.
            </p>
          </div>
          <ol className="grid gap-2">
            {SCRIPT.map((step, i) => (
              <li
                key={i}
                className="border-line bg-surface flex gap-4 rounded-xl border px-4 py-3.5"
              >
                <span className="font-display bg-accent-soft text-accent-strong flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-ink-soft pt-0.5 text-[15px] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-line border-t">
        <div className="text-muted mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[13px] sm:flex-row sm:justify-between sm:px-8">
          <p>Platterio · Menú interactivo para restaurantes</p>
          <p>Fogón 27 es un restaurante ficticio. Sin backend: todo vive en este navegador.</p>
        </div>
      </footer>

      <DemoPanel floating={false} />
    </div>
  );
}

function DemoStatus() {
  const restaurant = useRestaurant();
  const current = useCurrentSlot();
  const demo = useDemoSettings();
  const now = useNow();
  const tabs = useConnectedTabs();
  const history = useHistory();
  const alerts = useAlerts();
  const openAlerts = alerts.filter((a) => !a.resolved).length;
  const stats = useMemo(
    () => ({ orders: history.orders.length, reviews: history.dishRatings.length }),
    [history],
  );

  return (
    <div className="border-line bg-surface shadow-card rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <RestaurantMark name={restaurant.name} className="text-[17px]" />
        <Badge tone="success">
          <span className="bg-success size-1.5 rounded-full" aria-hidden />
          {plural(tabs, "pestaña", "pestañas")}
        </Badge>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Item label="Franja actual">
          {current.upcoming ? "Fuera de horario" : (current.slot?.name ?? "—")}
          {current.upcoming && current.slot && (
            <span className="text-muted block text-xs font-normal">
              Sigue {current.slot.name.toLowerCase()}
            </span>
          )}
          {current.simulated && (
            <span className="text-accent-strong ml-1.5 text-xs font-medium">simulada</span>
          )}
        </Item>
        <Item label="Hora de la demo">
          {formatTime(new Date(now))}
          {demo.clock.scale > 1 && (
            <span className="text-accent-strong ml-1.5 text-xs font-medium">
              ×{demo.clock.scale}
            </span>
          )}
        </Item>
        <Item label="Historial">
          {plural(stats.orders, "pedido", "pedidos")}
          <span className="text-muted block text-xs font-normal">
            {plural(stats.reviews, "reseña", "reseñas")} en 14 días
          </span>
        </Item>
        <Item label="Alertas">
          {openAlerts === 0 ? "Ninguna" : plural(openAlerts, "sin resolver", "sin resolver")}
          <span className="text-muted block text-xs font-normal first-letter:uppercase">
            {formatDay(new Date(now))}
          </span>
        </Item>
      </dl>
      <Button variant="ink" block className="mt-5" onClick={openDemoPanel}>
        <WandSparkles aria-hidden /> Hora simulada, tiempo y reinicio
      </Button>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted text-xs font-medium">{label}</dt>
      <dd className="text-ink mt-0.5 text-[15px] font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function ClientCard() {
  const tables = useTables();
  const hydrated = useHydrated();
  return (
    <article className="border-line bg-surface shadow-card relative flex flex-col overflow-hidden rounded-2xl border p-5 md:col-span-2 lg:col-span-1 lg:row-span-2">
      <CardHead icon={ScanQrCode} device={Smartphone} deviceLabel="Celular" title="Cliente" />
      <p className="text-muted mt-2 text-[15px] leading-relaxed">
        Lo que abre el QR de la mesa: recomendados, carta con filtros, pedido compartido y
        calificación.
      </p>
      <p className="text-muted mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">
        Escanea la mesa
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(hydrated
          ? tables
          : Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, number: i + 1 }))
        ).map((t) => (
          <Link
            key={t.id}
            href={`/mesa/${t.number}`}
            className="group border-line-strong bg-bg hover:border-accent hover:bg-accent-soft flex h-16 flex-col items-center justify-center rounded-xl border transition"
          >
            <span className="text-muted text-[11px] font-medium">Mesa</span>
            <span className="font-display text-xl leading-none font-semibold tabular-nums">
              {t.number}
            </span>
          </Link>
        ))}
      </div>
      <p className="text-muted mt-auto pt-5 text-[13px] leading-relaxed">
        Consejo: abre la misma mesa en dos pestañas para probar el pedido en grupo.
      </p>
    </article>
  );
}

function WaiterList() {
  const waiters = useWaiters();
  const tables = useTables();
  const hydrated = useHydrated();
  if (!hydrated) return <Skeleton className="h-10" />;
  return (
    <ul className="flex flex-wrap gap-2">
      {waiters.map((w) => {
        const numbers = tables.filter((t) => w.tableIds.includes(t.id)).map((t) => t.number);
        return (
          <li key={w.id}>
            <Link
              href="/mesero"
              onClick={() => authActions.loginAsDemo(w.id)}
              className="bg-surface-2 text-ink-soft hover:bg-accent-soft inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] transition-colors"
            >
              <span className="text-ink font-semibold">{w.name}</span>· Mesas{" "}
              {numbers.length ? `${numbers[0]}–${numbers[numbers.length - 1]}` : "—"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CardHead({
  icon: Icon,
  device: Device,
  deviceLabel,
  title,
  dark,
}: {
  icon: LucideIcon;
  device: LucideIcon;
  deviceLabel: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            dark ? "bg-[#1A1816] text-[#F7F3EC]" : "bg-accent-soft text-accent-strong",
          )}
        >
          <Icon className="size-5.5" aria-hidden strokeWidth={1.7} />
        </span>
        <div>
          <h3 className="font-display text-xl leading-tight font-semibold">{title}</h3>
          <p className="text-muted flex items-center gap-1 text-xs">
            <Device className="size-3.5" aria-hidden /> {deviceLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  icon,
  device,
  deviceLabel,
  title,
  description,
  href,
  extra,
  dark,
  className,
}: {
  icon: LucideIcon;
  device: LucideIcon;
  deviceLabel: string;
  title: string;
  description: string;
  href: string;
  extra?: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "border-line bg-surface shadow-card flex flex-col rounded-2xl border p-5",
        className,
      )}
    >
      <CardHead icon={icon} device={device} deviceLabel={deviceLabel} title={title} dark={dark} />
      <p className="text-muted mt-2 text-[15px] leading-relaxed">{description}</p>
      {extra && <div className="mt-4">{extra}</div>}
      <div className="mt-auto flex items-center gap-2 pt-5">
        <Link href={href} className={buttonClasses({ variant: "secondary", className: "flex-1" })}>
          Entrar <ArrowRight aria-hidden />
        </Link>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir ${title} en una pestaña nueva`}
          className={buttonClasses({ variant: "ghost", className: "w-11 px-0" })}
        >
          <ArrowUpRight aria-hidden />
        </a>
      </div>
    </article>
  );
}
