"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/frontend/i18n/LocaleProvider";
import { eventLabel } from "@/frontend/lib/labels";
import { onRefresh } from "@/frontend/lib/refresh";
import { toEtClock } from "@/lib/time";

type Row = {
  ticker: string | null;
  form: string;
  accessionNumber: string;
  acceptanceDatetime: string | null;
  documentUrl: string;
  newsId: string | null;
  eventType: string | null;
  impactScore: number | null;
  sentiment: string | null;
};

export default function SecPage() {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/sec", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (json.error) setError(json.error);
        else {
          setError(null);
          const rows = (json.items ?? []) as Row[];
          rows.sort(
            (a, b) =>
              Date.parse(b.acceptanceDatetime ?? "1970-01-01") - Date.parse(a.acceptanceDatetime ?? "1970-01-01"),
          );
          setItems(rows);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : t("loadFailed"));
      }
    }
    load();
    const interval = setInterval(load, 15_000);
    const stop = onRefresh(load);
    return () => {
      alive = false;
      clearInterval(interval);
      stop();
    };
  }, [t]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("secLive")}</h2>
        <p className="mt-1 text-sm text-mute">{t("secSubtitle")}</p>
      </div>
      {error ? <div className="text-sm text-neg">{error}</div> : null}
      <div className="overflow-hidden rounded-xl border border-line">
        {items.map((row) => (
          <div
            key={row.accessionNumber}
            className="grid grid-cols-[72px_64px_1fr_48px] gap-2 border-b border-line px-3 py-3 last:border-b-0 md:grid-cols-[80px_72px_72px_1fr_56px]"
          >
            <div className="font-mono text-sm font-semibold">{row.ticker ?? "—"}</div>
            <div className="font-mono text-xs text-mute">{row.form}</div>
            <div className="hidden font-mono text-xs text-mute md:block">
              {row.acceptanceDatetime ? toEtClock(row.acceptanceDatetime) : "—"}
            </div>
            <div className="text-xs">
              {row.newsId ? (
                <Link href={`/news/${row.newsId}`} className="text-ink hover:text-pos">
                  {row.eventType ? eventLabel(row.eventType, locale) : t("openAnalysis")}
                </Link>
              ) : (
                <a href={row.documentUrl} className="text-mute hover:text-ink" target="_blank" rel="noreferrer">
                  {t("filing")}
                </a>
              )}
            </div>
            <div className={`text-right font-mono text-sm ${Number(row.impactScore) >= 70 ? "text-warn" : "text-mute"}`}>
              {row.impactScore ?? "—"}
            </div>
          </div>
        ))}
        {!items.length && !error ? <div className="p-4 text-sm text-mute">{t("noFilings")}</div> : null}
      </div>
    </div>
  );
}
