import { padCik } from "@/lib/format";
import { secFetchJson } from "@/services/sec/client";

export type TickerRecord = {
  ticker: string;
  companyName: string;
  cik: string;
};

type SecTickerFile = Record<string, { cik_str: number; ticker: string; title: string }>;

let cache: { byCik: Map<string, TickerRecord>; byTicker: Map<string, TickerRecord>; loadedAt: number } | null =
  null;
const TTL_MS = 12 * 60 * 60 * 1000;

export async function loadTickerMap(force = false): Promise<{
  byCik: Map<string, TickerRecord>;
  byTicker: Map<string, TickerRecord>;
}> {
  if (cache && !force && Date.now() - cache.loadedAt < TTL_MS) {
    return cache;
  }
  const data = await secFetchJson<SecTickerFile>("https://www.sec.gov/files/company_tickers.json");
  const byCik = new Map<string, TickerRecord>();
  const byTicker = new Map<string, TickerRecord>();
  for (const row of Object.values(data)) {
    const rec: TickerRecord = {
      ticker: row.ticker.toUpperCase(),
      companyName: row.title,
      cik: padCik(row.cik_str),
    };
    byCik.set(rec.cik, rec);
    byTicker.set(rec.ticker, rec);
  }
  cache = { byCik, byTicker, loadedAt: Date.now() };
  return cache;
}

export async function resolveTicker(cik: string | number): Promise<TickerRecord | null> {
  const { byCik } = await loadTickerMap();
  return byCik.get(padCik(cik)) ?? null;
}

export async function resolveCik(ticker: string): Promise<TickerRecord | null> {
  const { byTicker } = await loadTickerMap();
  return byTicker.get(ticker.trim().toUpperCase()) ?? null;
}
