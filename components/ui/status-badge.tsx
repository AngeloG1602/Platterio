import { Ban, ChefHat, CircleCheck, Clock, HandPlatter, PackageCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STATUS_LABEL } from "@/lib/domain/orderStatus";
import type { OrderStatus } from "@/lib/domain/types";
import { Badge } from "./chip";
import { t } from "@/lib/i18n";

const CONFIG: Record<
  OrderStatus,
  { icon: LucideIcon; tone: "neutral" | "accent" | "success" | "warning" | "danger" }
> = {
  pendiente: { icon: Clock, tone: "warning" },
  confirmado: { icon: CircleCheck, tone: "neutral" },
  en_preparacion: { icon: ChefHat, tone: "accent" },
  listo: { icon: PackageCheck, tone: "success" },
  entregado: { icon: HandPlatter, tone: "neutral" },
  rechazado: { icon: Ban, tone: "danger" },
};

/** Estado del pedido con ícono y texto (nunca solo color). */
export function StatusBadge({ status, short = false }: { status: OrderStatus; short?: boolean }) {
  const { icon: Icon, tone } = CONFIG[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden />
      {short && status === "pendiente" ? t("Por confirmar") : t(STATUS_LABEL[status])}
    </Badge>
  );
}
