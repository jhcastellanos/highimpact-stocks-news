import { enUS, es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Locale } from "@/lib/locale";

export const DISPLAY_TZ = "America/New_York";

export function nowUtc(): Date {
  return new Date();
}

export function toEtLabel(date: Date | string, locale: Locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return locale === "es" ? "Desconocido" : "Unknown";
  const dfLocale = locale === "es" ? es : enUS;
  const pattern = locale === "es" ? "d MMM yyyy h:mm a" : "MMM d, yyyy h:mm a";
  return formatInTimeZone(d, DISPLAY_TZ, pattern, { locale: dfLocale }) + " ET";
}

export function toEtClock(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Unknown";
  return formatInTimeZone(d, DISPLAY_TZ, "HH:mm") + " ET";
}

export function relativeTime(date: Date | string, locale: Locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return locale === "es" ? "ahora" : "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return locale === "es" ? "ahora" : "just now";
  if (locale === "es") {
    if (mins < 60) return `hace ${mins} ${mins === 1 ? "minuto" : "minutos"}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
    const days = Math.floor(hours / 24);
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function startOfEtDay(date = new Date()): Date {
  const ymd = formatInTimeZone(date, DISPLAY_TZ, "yyyy-MM-dd");
  return fromZonedTime(`${ymd} 00:00:00`, DISPLAY_TZ);
}

export function isUsEquitySession(date = new Date()): "premarket" | "regular" | "afterhours" | "closed" {
  const day = formatInTimeZone(date, DISPLAY_TZ, "EEE");
  if (day === "Sat" || day === "Sun") return "closed";
  const hm = formatInTimeZone(date, DISPLAY_TZ, "HHmm");
  const n = Number(hm);
  if (n >= 400 && n < 930) return "premarket";
  if (n >= 930 && n < 1600) return "regular";
  if (n >= 1600 && n < 2000) return "afterhours";
  return "closed";
}

export function isFloridaPushWindow(date = new Date()): boolean {
  const hm = Number(formatInTimeZone(date, DISPLAY_TZ, "HHmm"));
  return hm >= 800 && hm <= 2000;
}
