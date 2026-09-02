"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewsCard } from "@/backend/news-query";
import { NewsCardView } from "@/frontend/components/NewsCard";
import { useI18n } from "@/frontend/i18n/LocaleProvider";
import { useTranslatedTexts } from "@/frontend/i18n/useTranslatedTexts";
import { onRefresh } from "@/frontend/lib/refresh";

export function NewsFeed({
  today = false,
  watchlistTickers,
}: {
  today?: boolean;
  watchlistTickers?: string[];
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<NewsCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (today) p.set("today", "1");
    p.set("sentiment", "STRONGLY_POSITIVE");
    p.set("minScore", "70");
    return p.toString();
  }, [today]);

  useEffect(() => {
    let alive = true;
    async function load(background = false) {
      if (!background) setLoading(true);
      try {
        const res = await fetch(`/api/news?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) setError(json.error ?? t("unableToLoadNews"));
        else {
          setError(null);
          setItems(json.items ?? []);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : t("unableToLoadNews"));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => load(true), 15_000);
    const stop = onRefresh(() => load());
    return () => {
      alive = false;
      clearInterval(interval);
      stop();
    };
  }, [qs, t]);

  const visible = useMemo(() => {
    const list = watchlistTickers
      ? items.filter((i) => i.ticker && watchlistTickers.includes(i.ticker))
      : items;
    return [...list].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, [items, watchlistTickers]);

  const { texts: headlines, pending } = useTranslatedTexts(visible.map((item) => item.headline));

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-neg/30 bg-neg/10 p-4 text-sm text-neg">{error}</div>
      ) : null}
      {loading && !visible.length ? <div className="text-sm text-mute">{t("loading")}</div> : null}
      {pending && visible.length ? <div className="text-xs font-mono uppercase tracking-widest text-mute">{t("translating")}</div> : null}
      {!loading && !error && !visible.length ? (
        <div className="rounded-xl border border-line bg-panel p-5 text-sm text-mute">{t("emptyFeed")}</div>
      ) : null}
      {visible.map((item, i) => (
        <NewsCardView key={item.id} item={item} headline={headlines[i]} />
      ))}
    </div>
  );
}
