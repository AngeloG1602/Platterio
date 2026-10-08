import {
  ArrowRight,
  BellRing,
  Bike,
  ChefHat,
  ClipboardList,
  Languages,
  Landmark,
  LayoutDashboard,
  Palette,
  QrCode,
  Rotate3d,
  ScanQrCode,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlatterioLogo } from "@/components/brand/logos";
import { buttonClasses } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/data/plans";
import { cn } from "@/lib/cn";
import { Phone, Screen } from "./frames";
import { Pricing } from "./pricing";

const P = "/producto";

const NAV = [
  ["#como-funciona", "Cómo funciona"],
  ["#funciones", "Funciones"],
  ["#3d", "Vista 3D"],
  ["#planes", "Planes"],
  ["#preguntas", "Preguntas"],
] as const;

/** Página de ventas de Platterio (versión preliminar). */
export function SalesPage() {
  return (
    <div className="bg-bg text-ink">
      <a
        href="#contenido"
        className="bg-ink text-bg sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <Hero />
        <Steps />
        <Roles />
        <Features />
        <ThreeD />
        <Control />
        <section id="planes" className="scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionTitle
              eyebrow="Planes"
              title="Un precio claro, sin cobros por pedido"
              text={`Pruébalo ${TRIAL_DAYS} días gratis. Sin contratos: cambias de plan o cancelas cuando quieras.`}
            />
            <div className="mt-10">
              <Pricing />
            </div>
            <p className="text-muted mx-auto mt-6 max-w-2xl text-center text-[13px]">
              Precios y condiciones de ejemplo para esta versión preliminar; se confirman al lanzar.
              Los precios no incluyen impuestos.
            </p>
          </div>
        </section>
        <NotDoing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ——— Piezas ——— */

function Header() {
  return (
    <header className="border-line bg-bg/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
        <Link href="/producto" aria-label="Platterio, inicio">
          <PlatterioLogo />
        </Link>
        <nav aria-label="Secciones" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-ink-soft hover:text-ink hover:bg-surface-2 rounded-full px-3.5 py-2 text-[15px] font-medium"
            >
              {label}
            </a>
          ))}
        </nav>
        <Link href="/" className={buttonClasses({ size: "sm", className: "ml-auto" })}>
          Probar la demo <ArrowRight aria-hidden />
        </Link>
      </div>
    </header>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
  center = true,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className="text-accent-strong text-xs font-semibold tracking-[0.16em] uppercase">
        {eyebrow}
      </p>
      <h2 className="font-display mt-2 text-[34px] leading-[1.1] font-semibold tracking-tight sm:text-[42px]">
        {title}
      </h2>
      {text && <p className="text-ink-soft mt-3 text-[17px] leading-relaxed">{text}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden px-5 pt-14 pb-20 sm:px-8 lg:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="border-line bg-surface text-ink-soft inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
            <ScanQrCode className="text-accent-strong size-4" aria-hidden /> Para restaurantes,
            cafés y bares
          </p>
          <h1 className="font-display mt-5 text-[44px] leading-[1.03] font-semibold tracking-tight sm:text-[60px]">
            Tu carta, tu salón y tu caja, en un solo sistema.
          </h1>
          <p className="text-ink-soft mt-5 max-w-xl text-[18px] leading-relaxed">
            Tus clientes escanean el QR, miran la carta con fotos y en 3D, y piden desde la mesa. El
            mesero confirma, la cocina prepara y caja cobra. Y tú ves todo lo que pasa en reportes
            claros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonClasses({ size: "lg" })}>
              Probar la demo <ArrowRight aria-hidden />
            </Link>
            <a href="#planes" className={buttonClasses({ size: "lg", variant: "secondary" })}>
              Ver planes
            </a>
          </div>
          <ul className="text-ink-soft mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium">
            <li className="flex items-center gap-2">
              <Smartphone className="text-accent-strong size-4" aria-hidden /> Sin instalar nada
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="text-accent-strong size-4" aria-hidden /> Pide solo quien está
              sentado
            </li>
            <li className="flex items-center gap-2">
              <ClipboardList className="text-accent-strong size-4" aria-hidden /> {TRIAL_DAYS} días
              de prueba
            </li>
          </ul>
        </div>
        <div className="relative mx-auto flex w-full max-w-[560px] items-end justify-center gap-4">
          <Phone
            src={`${P}/c05-carta.jpg`}
            alt="La carta del restaurante en el celular del cliente, con recomendados y fotos"
            priority
            className="w-[44%] -rotate-3"
          />
          <Phone
            src={`${P}/c07-visor-3d.jpg`}
            alt="El visor 3D de una hamburguesa, para girarla y armarla a gusto"
            priority
            className="mb-10 w-[44%] rotate-2"
          />
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps: [LucideIcon, string, string][] = [
    [
      QrCode,
      "El cliente escanea el QR de su mesa",
      "El QR es fijo: lo pegas una vez. Desde el primer segundo puede mirar la carta con precios, aunque todavía no pueda pedir.",
    ],
    [
      BellRing,
      "El mesero abre la mesa y da un PIN",
      "Así solo pide quien está sentado. El cliente puede avisarle desde la misma pantalla, y la mesa se cierra sola si queda sin actividad.",
    ],
    [
      UtensilsCrossed,
      "Piden, el mesero confirma y cocina prepara",
      "El carrito es compartido por la mesa. El mesero revisa el pedido, lo ajusta si hace falta y lo manda a cocina. Todos ven el estado en vivo.",
    ],
    [
      Landmark,
      "Caja cobra y tú ves el resultado",
      "Cobro en partes y con varias formas de pago, cierre de caja con diferencia y reportes que se pueden descargar.",
    ],
  ];
  return (
    <section id="como-funciona" className="bg-surface scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Cómo funciona"
          title="Del QR a la caja, sin papeles ni confusiones"
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([Icon, title, text], i) => (
            <li key={title} className="border-line bg-bg rounded-2xl border p-6">
              <span className="bg-accent-soft text-accent-strong flex size-11 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="text-muted mt-4 text-xs font-semibold tracking-wider uppercase">
                Paso {i + 1}
              </p>
              <h3 className="mt-1 text-[18px] leading-snug font-semibold">{title}</h3>
              <p className="text-ink-soft mt-2 text-[15px] leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Roles() {
  const roles: [LucideIcon, string, string[]][] = [
    [
      Smartphone,
      "Cliente",
      [
        "Carta con fotos, ingredientes y alérgenos",
        "Recomendados según la hora y sus alergias",
        "Sigue su pedido y califica al final",
      ],
    ],
    [
      ClipboardList,
      "Mesero",
      [
        "Ve sus mesas y los pedidos por confirmar",
        "Toma pedidos y los edita, con registro de quién cambió qué",
        "Abre la mesa y entrega el PIN con un QR",
      ],
    ],
    [
      ChefHat,
      "Cocina",
      [
        "Tablero oscuro, de letra grande, en orden de llegada",
        "Las personalizaciones salen resaltadas: SIN, EXTRA",
        "Aviso cuando el mesero cambia algo",
      ],
    ],
    [
      Landmark,
      "Caja",
      [
        "Abre y cierra turnos con el efectivo",
        "Cobra en partes, con tarjeta, efectivo o transferencia",
        "Gestiona domicilios y equipo",
      ],
    ],
    [
      LayoutDashboard,
      "Administrador",
      [
        "Menú, precios, recomendados y marca",
        "Reportes completos con descarga en CSV",
        "Usuarios, mesas, horarios y zonas",
      ],
    ],
  ];
  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Para todo tu equipo"
          title="Una pantalla pensada para cada persona"
          text="Cada quien entra con su PIN y ve solo lo que le toca. Nadie tiene que aprender un sistema complicado."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {roles.map(([Icon, name, items]) => (
            <li key={name} className="border-line bg-surface shadow-card rounded-2xl border p-5">
              <Icon className="text-accent-strong size-6" aria-hidden />
              <h3 className="font-display mt-3 text-[22px] font-semibold">{name}</h3>
              <ul className="text-ink-soft mt-3 flex flex-col gap-2 text-[14.5px] leading-snug">
                {items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  text,
  points,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(flip && "lg:order-2")}>
        <p className="text-accent-strong text-xs font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
        <h3 className="font-display mt-2 text-[32px] leading-[1.12] font-semibold tracking-tight">
          {title}
        </h3>
        <p className="text-ink-soft mt-3 text-[17px] leading-relaxed">{text}</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[15.5px]">
              <span className="bg-accent mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn("flex justify-center", flip && "lg:order-1")}>{visual}</div>
    </div>
  );
}

function Features() {
  return (
    <section id="funciones" className="bg-surface scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-24">
        <SectionTitle
          eyebrow="Funciones"
          title="Lo que tu restaurante necesita, y nada que estorbe"
        />
        <FeatureRow
          eyebrow="Cocina y salón"
          title="Pedidos que llegan claros a la cocina"
          text="El mesero siempre puede corregir un pedido, antes y después de confirmarlo. Nada se pierde: cada cambio queda con quién lo hizo, cuándo y por qué, y cocina recibe el aviso."
          points={[
            "Confirmación del mesero antes de que el pedido llegue a cocina",
            "Agotados, cambios y anulaciones con motivo",
            "Tablero de cocina con tiempos y colores de alerta",
          ]}
          visual={
            <Screen
              src={`${P}/s09-cocina.jpg`}
              alt="El tablero de cocina en modo oscuro con un pedido personalizado"
              ratio="aspect-[16/10]"
              className="w-full max-w-xl"
            />
          }
        />
        <FeatureRow
          flip
          eyebrow="Caja"
          title="Cobra y cierra la caja sin que falte nada"
          text="Abre el turno con el efectivo que hay, cobra cada mesa (en partes si lo piden) y cierra contando: si no cuadra, el sistema te pide explicar por qué."
          points={[
            "Efectivo, tarjeta, transferencia y otros",
            "Mesas cerradas sin cobro marcadas en el reporte",
            "Platterio no procesa pagos: tú cobras como siempre y lo registras",
          ]}
          visual={
            <Screen
              src={`${P}/s13-caja-turno.jpg`}
              alt="La pantalla de caja con el turno abierto y las mesas por cobrar"
              ratio="aspect-[16/11]"
              className="w-full max-w-xl"
            />
          }
        />
        <FeatureRow
          eyebrow="Reportes"
          title="Entiende tu negocio sin una hoja de cálculo"
          text="Lo vendido contra lo cobrado, por forma de pago y por mesero, los cambios del personal, los platos más pedidos por franja y los cierres de caja. Todo con descarga en CSV para tu contador."
          points={[
            "Todos los reportes van incluidos en el plan Esencial",
            "Periodos: hoy, 7 días, 14 días o fechas propias",
            "Alertas cuando una mesa califica mal el servicio",
          ]}
          visual={
            <Screen
              src={`${P}/a03-reportes.jpg`}
              alt="El panel de reportes con lo vendido, lo cobrado y los cierres de caja"
              ratio="aspect-[4/3]"
              className="w-full max-w-xl"
            />
          }
        />
        <FeatureRow
          flip
          eyebrow="Domicilios y recogida"
          title="Vende también fuera del salón"
          text="Tus clientes piden desde su casa, eligen su zona y siguen el pedido hasta la puerta. Caja lo confirma, cocina lo prepara y el domiciliario sale con él."
          points={[
            "Zonas con tarifa, pedido mínimo y tiempo estimado",
            "Pago al recibir, con el cambio que hay que llevar",
            "Pedidos para recoger en el mostrador",
          ]}
          visual={
            <div className="flex w-full max-w-md items-end justify-center gap-4">
              <Phone
                src={`${P}/d01-domicilio-carta.jpg`}
                alt="La carta para pedir a domicilio"
                className="w-[48%]"
              />
              <Phone
                src={`${P}/d04-domicilio-seguimiento.jpg`}
                alt="El seguimiento del pedido a domicilio para el cliente"
                className="mb-8 w-[48%]"
              />
            </div>
          }
        />
        <FeatureRow
          eyebrow="Tu marca"
          title="Que se vea como tu restaurante"
          text="Sube tu logo, elige entre nueve estilos de carta (claros, oscuros, con portada, tipo carta impresa…) y las tipografías que quieras. Todo cambia al instante."
          points={[
            "Estilos completos: bistró oscuro, café minimal, gourmet, parrilla, urbano y más",
            "Color de acento propio con buen contraste garantizado",
            "Carta en español e inglés y precios en tu moneda",
          ]}
          visual={
            <Screen
              src={`${P}/a02-configuracion.jpg`}
              alt="El panel donde el administrador elige plantilla, tipografías y logo"
              ratio="aspect-[4/3]"
              className="w-full max-w-xl"
            />
          }
        />
      </div>
    </section>
  );
}

function ThreeD() {
  return (
    <section id="3d" className="bg-ink text-bg scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#F5B79D] uppercase">
            Vista 3D
          </p>
          <h2 className="font-display mt-2 text-[36px] leading-[1.08] font-semibold tracking-tight sm:text-[46px]">
            Que tus clientes vean el plato antes de pedirlo
          </h2>
          <p className="text-bg/80 mt-4 text-[17px] leading-relaxed">
            Gira la hamburguesa, sepárala por capas, quita la cebolla o pide queso extra y mira cómo
            queda. El precio, los alérgenos y lo que ve la cocina se actualizan solos.
          </p>
          <ul className="text-bg/90 mt-6 flex flex-col gap-2.5 text-[15.5px]">
            <li className="flex gap-3">
              <Rotate3d className="mt-0.5 size-5 shrink-0 text-[#F5B79D]" aria-hidden /> Quitar,
              agregar, reemplazar y cambiar el acompañante
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#F5B79D]" aria-hidden /> Se
              adapta a las alergias del cliente
            </li>
            <li className="flex gap-3">
              <ChefHat className="mt-0.5 size-5 shrink-0 text-[#F5B79D]" aria-hidden /> La cocina
              recibe &ldquo;SIN cebolla · EXTRA queso&rdquo; ya listo
            </li>
          </ul>
          <p className="text-bg/65 mt-6 text-[14px]">
            El 3D es un servicio aparte, por plato: lo modelamos contigo (o usamos el modelo que ya
            tengas). Los platos sin 3D funcionan igual con fotos.
          </p>
        </div>
        <div className="flex items-end justify-center gap-4">
          <Phone
            src={`${P}/c07-visor-3d.jpg`}
            alt="Una hamburguesa en 3D para girar"
            className="w-[42%] border-[#3a3632]"
          />
          <Phone
            src={`${P}/c09-visor-ingredientes.jpg`}
            alt="La lista de ingredientes para quitar, agregar o cambiar"
            className="mb-10 w-[42%] border-[#3a3632]"
          />
        </div>
      </div>
    </section>
  );
}

function Control() {
  const items: [LucideIcon, string, string][] = [
    [
      ShieldCheck,
      "Solo pide quien está sentado",
      "QR fijo más PIN del mesero: nadie hace pedidos desde la calle ni de otra mesa.",
    ],
    [
      ClipboardList,
      "Registro de cambios",
      "Si alguien edita o anula un pedido, queda guardado quién, cuándo y por qué.",
    ],
    [
      Languages,
      "Español e inglés",
      "Para turistas y zonas con mucho visitante. Tú decides si ofreces los dos.",
    ],
    [
      Palette,
      "Tu identidad",
      "Logo, colores y tipografías propias; tu carta no parece la de nadie más.",
    ],
    [
      Bike,
      "Sin comisión por pedido",
      "Pagas tu plan y listo. Lo que vendes es tuyo, no compartes un porcentaje.",
    ],
    [
      Smartphone,
      "Sin hardware especial",
      "Funciona en los celulares y tablets que ya tienes. Sin instalar aplicaciones.",
    ],
  ];
  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Tranquilidad" title="Control sin complicarte" />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([Icon, title, text]) => (
            <li key={title} className="flex gap-4">
              <span className="bg-accent-soft text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-[17px] font-semibold">{title}</h3>
                <p className="text-ink-soft mt-1 text-[15px] leading-relaxed">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NotDoing() {
  return (
    <section className="bg-surface px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-[30px] leading-tight font-semibold">
          Lo que Platterio no hace (a propósito)
        </h2>
        <p className="text-ink-soft mt-3 text-[16px] leading-relaxed">
          Preferimos decirte esto de entrada para que no haya sorpresas.
        </p>
        <ul className="mt-5 flex flex-col gap-3 text-[16px]">
          <li>
            <strong>No procesa pagos.</strong> El cliente te paga como siempre (efectivo, datáfono,
            transferencia) y caja lo registra en el sistema.
          </li>
          <li>
            <strong>No calcula impuestos ni factura.</strong> El precio de tu carta es el precio
            final. La factura electrónica y los impuestos los sigues manejando con tu contador.
          </li>
          <li>
            <strong>No suma propina.</strong> Cada negocio maneja la propina a su manera.
          </li>
        </ul>
      </div>
    </section>
  );
}

const FAQS: [string, string][] = [
  [
    "¿Mis clientes tienen que instalar una aplicación?",
    "No. Escanean el QR y la carta se abre en el navegador de su celular, en español o en inglés.",
  ],
  [
    "¿Qué pasa si un cliente escanea el QR y el mesero todavía no abre la mesa?",
    "Puede mirar la carta con fotos y precios mientras espera, y avisarle al mesero desde la misma pantalla. Para pedir necesita el PIN que da el mesero.",
  ],
  [
    "¿Qué necesito para usarlo?",
    "Un celular o tablet para el mesero y la cocina, y el QR impreso en cada mesa. No hace falta comprar hardware especial.",
  ],
  [
    "¿El sistema cobra con tarjeta?",
    "No. Platterio registra los cobros que haces tú con tus medios de siempre. Así no pagas comisión por cada venta.",
  ],
  [
    "¿Cuánto cuesta la vista 3D?",
    "Es un servicio aparte, por plato, y se cotiza según el plato. Los platos sin 3D funcionan igual con fotos.",
  ],
  [
    "¿Puedo cambiar de plan o cancelar?",
    "Sí, cuando quieras. Pagas mensual o anual y el acceso queda vigente hasta la fecha pagada.",
  ],
  [
    "¿Qué pasa con los datos de mis clientes?",
    "Solo se guardan los datos necesarios para el pedido (por ejemplo, un nombre o un celular en domicilios), siguiendo la Ley 1581 de 2012. Las políticas completas estarán disponibles al lanzar.",
  ],
];

function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow="Preguntas" title="Lo que casi todos preguntan" />
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map(([q, a]) => (
            <details key={q} className="border-line bg-surface group rounded-2xl border px-5 py-1">
              <summary className="min-h-14 cursor-pointer list-none py-3.5 text-[17px] font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {q}
                  <span
                    aria-hidden
                    className="text-accent-strong text-2xl leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="text-ink-soft pb-4 text-[16px] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-5 pb-20 sm:px-8">
      <div className="bg-accent-strong mx-auto max-w-6xl rounded-3xl px-6 py-14 text-center text-white sm:px-12">
        <h2 className="font-display text-[34px] leading-tight font-semibold sm:text-[44px]">
          Míralo funcionando antes de decidir
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[17px] text-white/90">
          La demo tiene un restaurante de ejemplo con todo: cliente, mesero, cocina, caja,
          domicilios y reportes. No necesitas registrarte.
        </p>
        <Link
          href="/"
          className="text-accent-strong mt-7 inline-flex h-14 items-center gap-2 rounded-xl bg-white px-7 text-[17px] font-semibold"
        >
          Probar la demo <ArrowRight aria-hidden className="size-5" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-line border-t px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PlatterioLogo tone="muted" />
        <nav
          aria-label="Pie de página"
          className="text-muted flex flex-wrap gap-x-5 gap-y-2 text-[14px]"
        >
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-ink">
              {label}
            </a>
          ))}
          <Link href="/" className="hover:text-ink">
            Demo
          </Link>
        </nav>
        <p className="text-muted text-[13px]">Versión preliminar de la página de ventas.</p>
      </div>
    </footer>
  );
}
