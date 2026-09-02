"use client";

import { bandLabel } from "@/frontend/lib/labels";
import { useI18n } from "@/frontend/i18n/LocaleProvider";

export function ImpactBadge({ score, band }: { score: number; band: string }) {
  const { locale } = useI18n();
  const extreme = band === "EXTREME" || score >= 85;
  const high = score >= 70;
  const color = extreme || high ? "text-accent" : score >= 50 ? "text-gold" : "text-mute";
  const fire = extreme ? "🔥" : high ? "⚡" : "";
  return (
    <div className={`text-right ${color}`}>
      <div className="font-mono text-[11px] tracking-[0.14em] uppercase">
        {fire} {score} {bandLabel(band, locale)}
      </div>
    </div>
  );
}
