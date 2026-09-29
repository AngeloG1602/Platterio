import { format } from "date-fns";
import { es } from "date-fns/locale";

function groupThousands(value: number): string {
  return Math.abs(Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Precio en formato colombiano: 22900 → "$22.900". */
export function formatCOP(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${groupThousands(value)}`;
}

/** Diferencia de precio con signo: 7000 → "+$7.000". */
export function formatPriceDelta(value: number): string {
  if (value === 0) return "";
  return value > 0 ? `+${formatCOP(value)}` : formatCOP(value);
}

/** Hora de 12 h: "12:30 p. m." */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${h12}:${minutes} ${hours < 12 ? "a. m." : "p. m."}`;
}

/** "HH:MM" de 24 h a 12 h: "15:00" → "3:00 p. m." */
export function formatClock(hhmm: string): string {
  const [h = "0", m = "0"] = hhmm.split(":");
  const date = new Date(2000, 0, 1, Number(h), Number(m));
  return formatTime(date);
}

/** Rango compacto de franja: ("07:00","11:00") → "7 – 11 a. m."; ("11:00","15:00") → "11 a. m. – 3 p. m." */
export function formatSlotRange(start: string, end: string): string {
  const part = (hhmm: string) => {
    const [h = "0", m = "00"] = hhmm.split(":");
    const hour = Number(h);
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return { text: m === "00" ? `${h12}` : `${h12}:${m}`, period: hour < 12 ? "a. m." : "p. m." };
  };
  const a = part(start);
  const b = part(end);
  return a.period === b.period
    ? `${a.text} – ${b.text} ${b.period}`
    : `${a.text} ${a.period} – ${b.text} ${b.period}`;
}

const SHORT_MONTHS = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sept.",
  "oct.",
  "nov.",
  "dic.",
];

/** Fecha corta: "lunes 28 de sept." */
export function formatDay(date: Date): string {
  const weekday = format(date, "EEEE", { locale: es });
  return `${weekday} ${date.getDate()} de ${SHORT_MONTHS[date.getMonth()]}`;
}

/** Duración corta para contadores: 75 s → "1:15", 3700 s → "1 h 01 min". */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Pluralización simple: plural(2, "plato", "platos") → "2 platos". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Tiempo relativo corto: "hace un momento", "hace 5 min", "hace 2 h", "ayer 8:40 p. m.", "lunes 28 de sept. 9:10 a. m." */
export function formatRelative(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `hace ${Math.floor(minutes / 60)} h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `ayer ${formatTime(date)}`;
  return `${formatDay(date)} ${formatTime(date)}`;
}
