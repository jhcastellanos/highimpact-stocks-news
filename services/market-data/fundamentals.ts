import { eq } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import { getEnv } from "@/lib/env";
import { padCik } from "@/lib/format";
import type { CompanyFundamentals } from "@/services/classification/materiality";
import { secFetchJson } from "@/services/sec/client";
import { resolveCik } from "@/services/sec/ticker-map";

type FactsFile = {
  facts?: Record<
    string,
    Record<
      string,
      {
        units?: Record<string, Array<{ end: string; val: number; form?: string; fy?: number; fp?: string }>>;
      }
    >
  >;
};

const REVENUE_KEYS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
];

const SHARE_KEYS = ["EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding"];

export async function getCompanyFundamentals(ticker: string, cik?: string | null): Promise<CompanyFundamentals | null> {
  const db = getDb();
  const existing = await db.select().from(schema.companies).where(eq(schema.companies.ticker, ticker)).limit(1);
  const row = existing[0];
  const fresh =
    row?.marketDataUpdatedAt && Date.now() - new Date(row.marketDataUpdatedAt).getTime() < 12 * 60 * 60 * 1000;
  if (row && fresh) {
    return {
      ticker: row.ticker,
      companyName: row.companyName,
      marketCap: toNum(row.marketCap),
      annualRevenue: toNum(row.annualRevenue),
      lastPrice: toNum(row.lastPrice),
      sector: row.sector,
      industry: row.industry,
    };
  }

  const mapped = cik ? { cik: padCik(cik), companyName: row?.companyName ?? ticker, ticker } : await resolveCik(ticker);
  if (!mapped) {
    return row
      ? {
          ticker: row.ticker,
          companyName: row.companyName,
          marketCap: toNum(row.marketCap),
          annualRevenue: toNum(row.annualRevenue),
          lastPrice: toNum(row.lastPrice),
          sector: row.sector,
          industry: row.industry,
        }
      : null;
  }

  let annualRevenue: number | null = row ? toNum(row.annualRevenue) : null;
  let shares: number | null = row ? toNum(row.sharesOutstanding) : null;
  try {
    const facts = await secFetchJson<FactsFile>(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(mapped.cik)}.json`,
    );
    annualRevenue = latestUsd(facts, REVENUE_KEYS, { annualOnly: true }) ?? annualRevenue;
    shares = latestUsd(facts, SHARE_KEYS, { annualOnly: false }) ?? shares;
  } catch {
    // Company facts are optional; never invent a substitute.
  }

  const quote = await optionalQuote(ticker);
  const lastPrice = quote?.price ?? (row ? toNum(row.lastPrice) : null);
  const marketCap =
    quote?.marketCap ??
    (lastPrice != null && shares != null ? lastPrice * shares : row ? toNum(row.marketCap) : null);

  await db
    .insert(schema.companies)
    .values({
      ticker,
      companyName: mapped.companyName,
      cik: padCik(mapped.cik),
      marketCap: marketCap != null ? String(marketCap) : null,
      annualRevenue: annualRevenue != null ? String(annualRevenue) : null,
      sharesOutstanding: shares != null ? String(shares) : null,
      lastPrice: lastPrice != null ? String(lastPrice) : null,
      marketDataUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.companies.ticker,
      set: {
        companyName: mapped.companyName,
        cik: padCik(mapped.cik),
        marketCap: marketCap != null ? String(marketCap) : null,
        annualRevenue: annualRevenue != null ? String(annualRevenue) : null,
        sharesOutstanding: shares != null ? String(shares) : null,
        lastPrice: lastPrice != null ? String(lastPrice) : null,
        marketDataUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return {
    ticker,
    companyName: mapped.companyName,
    marketCap,
    annualRevenue,
    lastPrice,
    sector: row?.sector ?? null,
    industry: row?.industry ?? null,
  };
}

function latestUsd(
  facts: FactsFile,
  keys: string[],
  opts: { annualOnly: boolean },
): number | null {
  const usGaap = facts.facts?.["us-gaap"] ?? {};
  const dei = facts.facts?.dei ?? {};
  for (const key of keys) {
    const node = usGaap[key] ?? dei[key];
    const usd = node?.units?.USD ?? node?.units?.shares;
    if (!usd?.length) continue;
    const filtered = usd
      .filter((x) => (opts.annualOnly ? x.fp === "FY" || x.form === "10-K" : true))
      .sort((a, b) => b.end.localeCompare(a.end));
    const pick = filtered[0] ?? [...usd].sort((a, b) => b.end.localeCompare(a.end))[0];
    if (pick && Number.isFinite(pick.val)) return pick.val;
  }
  return null;
}

async function optionalQuote(ticker: string): Promise<{ price: number; marketCap: number | null } | null> {
  const key = getEnv().polygonApiKey;
  if (!key) return null;
  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?apiKey=${key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ticker?: { lastTrade?: { p?: number }; day?: { c?: number }; prevDay?: { c?: number }; market_cap?: number };
    };
    const price = json.ticker?.lastTrade?.p ?? json.ticker?.day?.c ?? json.ticker?.prevDay?.c;
    if (price == null || !Number.isFinite(price)) return null;
    return { price, marketCap: json.ticker?.market_cap ?? null };
  } catch {
    return null;
  }
}

function toNum(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
