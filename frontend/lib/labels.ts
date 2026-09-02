import {
  BAND_LABELS,
  EVENT_LABELS,
  FORM4_LABELS,
  HORIZON_LABELS,
  MARKET_EFFECT_LABELS,
  SENTIMENT_LABELS,
} from "@/frontend/i18n/messages";
import type { Locale } from "@/lib/locale";
import type { ImpactBand, Sentiment } from "@/lib/types";

export function eventLabel(type: string, locale: Locale = "en"): string {
  return EVENT_LABELS[locale][type] ?? type.replaceAll("_", " ");
}

export function sentimentLabel(s: string, locale: Locale = "en"): string {
  return SENTIMENT_LABELS[locale][s] ?? s.replaceAll("_", " ");
}

export function sentimentTone(s: string): "pos" | "neg" | "warn" | "mute" {
  if (s === "POSITIVE" || s === "STRONGLY_POSITIVE") return "pos";
  if (s === "NEGATIVE" || s === "STRONGLY_NEGATIVE") return "neg";
  if (s === "MIXED") return "warn";
  return "mute";
}

export function bandLabel(band: ImpactBand | string, locale: Locale = "en"): string {
  return BAND_LABELS[locale][band] ?? BAND_LABELS.en[band] ?? band.replaceAll("_", " ");
}

export function horizonLabel(horizon: string, locale: Locale = "en"): string {
  return HORIZON_LABELS[locale][horizon] ?? horizon.replaceAll("_", " ").toLowerCase();
}

export function marketEffectLabel(effect: string, locale: Locale = "en"): string {
  return MARKET_EFFECT_LABELS[locale][effect] ?? effect.replaceAll("_", " ");
}

export function form4Label(kind: string, locale: Locale = "en"): string {
  return FORM4_LABELS[locale][kind] ?? kind.replaceAll("_", " ");
}

export function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    sec: "SEC",
    benzinga: "Benzinga",
    globenewswire: "GlobeNewswire",
    businesswire: "Business Wire",
    prnewswire: "PR Newswire",
  };
  return map[source] ?? source;
}

export function formatCap(value: string | number | null | undefined, unknownLabel = "Mkt cap unknown"): string {
  if (value == null || value === "") return unknownLabel;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return unknownLabel;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export function classForSentiment(s: Sentiment | string): string {
  const t = sentimentTone(s);
  if (t === "pos") return "text-pos";
  if (t === "neg") return "text-neg";
  if (t === "warn") return "text-warn";
  return "text-mute";
}

export function borderForSentiment(s: Sentiment | string): string {
  const t = sentimentTone(s);
  if (t === "pos") return "border-l-pos";
  if (t === "neg") return "border-l-neg";
  if (t === "warn") return "border-l-warn";
  return "border-l-line";
}
