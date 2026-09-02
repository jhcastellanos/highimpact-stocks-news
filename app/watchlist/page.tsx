"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { NewsFeed } from "@/frontend/components/NewsFeed";
import { useI18n } from "@/frontend/i18n/LocaleProvider";

export default function WatchlistPage() {
  const { t } = useI18n();
  const [tickers, setTickers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/watchlist", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? t("watchlistUnavailable"));
      return;
    }
    setError(null);
    setTickers((json.items ?? []).map((i: { ticker: string }) => i.ticker));
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : t("watchlistUnavailable")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: input }),
    });
    setInput("");
    await reload();
  }

  async function remove(ticker: string) {
    await fetch(`/api/watchlist?ticker=${ticker}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("watchlist")}</h2>
      </div>
      {error ? <div className="text-sm text-neg">{error}</div> : null}
      <form onSubmit={add} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="OKLO"
          className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono uppercase outline-none"
        />
        <button className="rounded-lg bg-accent px-4 font-mono text-xs uppercase tracking-widest text-white">{t("add")}</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {tickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => remove(ticker)}
            className="rounded-full border border-line px-3 py-1 font-mono text-xs text-ink"
          >
            {ticker} ×
          </button>
        ))}
        {!tickers.length ? <span className="text-sm text-mute">{t("addTickers")}</span> : null}
      </div>
      <Suspense fallback={null}>
        <NewsFeed watchlistTickers={tickers} />
      </Suspense>
    </div>
  );
}
