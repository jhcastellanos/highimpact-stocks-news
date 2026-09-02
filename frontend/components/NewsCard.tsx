"use client";

import Link from "next/link";
import type { NewsCard } from "@/backend/news-query";
import { ImpactBadge } from "@/frontend/components/ImpactBadge";
import { useI18n } from "@/frontend/i18n/LocaleProvider";
import { eventLabel, formatCap, sentimentLabel, sourceLabel } from "@/frontend/lib/labels";
import { relativeTime } from "@/lib/time";

export function NewsCardView({ item, headline }: { item: NewsCard; headline?: string }) {
  const { locale, t } = useI18n();
  return (
    <Link
      href={`/news/${item.id}`}
      className="block rounded-xl border border-line border-l-4 bg-panel p-4 transition hover:bg-panel-2 border-l-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-wide">{item.ticker ?? "—"}</span>
            {item.watchlist ? (
              <span className="rounded border border-warn/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-warn">
                {t("watchlist")}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-sm text-mute">{item.company ?? t("unknownIssuer")}</div>
        </div>
        <ImpactBadge score={item.impactScore} band={item.impactBand} />
      </div>
      <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
        {sentimentLabel(item.sentiment, locale)}
      </div>
      <div className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-mute">{eventLabel(item.eventType, locale)}</div>
      <p className="mt-3 text-[19px] font-medium leading-snug text-ink">{headline ?? item.headline}</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-mute">
        <span>{item.sources.map(sourceLabel).join(" + ")}</span>
        <span>{relativeTime(item.publishedAt, locale)}</span>
        <span>{formatCap(item.marketCap, t("mktCapUnknown"))}</span>
      </div>
    </Link>
  );
}
