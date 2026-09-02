import { persistNormalizedItem } from "@/backend/persist";
import { getDb, schema } from "@/database/client";
import { inArray } from "drizzle-orm";
import { enabledNewsAdapters } from "@/services/news/registry";
import { isSp500OrNasdaq } from "@/services/market-data/listings";
import { SEC_CATALYST_FORMS } from "@/services/sec/forms";
import { fetchRecentSecFilings, fetchTodaysPriorityFilings, filingToNewsItem, type SecFeedEntry } from "@/services/sec/ingest";
import { resolveTicker } from "@/services/sec/ticker-map";

export async function runIngest(opts?: { maxFilings?: number; includeOptionalSources?: boolean; includeForm4?: boolean }) {
  const maxFilings = opts?.maxFilings ?? 8;
  const includeForm4 = opts?.includeForm4 ?? Boolean(opts?.includeOptionalSources);
  const results = {
    scanned: 0,
    inserted: 0,
    duplicates: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const live = await fetchRecentSecFilings(includeForm4 ? undefined : SEC_CATALYST_FORMS, 40);
  const today = await fetchTodaysPriorityFilings(undefined, { includeForm4 });
  const filings = [...today, ...live].filter(
    (e, i, arr) => arr.findIndex((x) => x.accessionNumber === e.accessionNumber) === i,
  );
  results.scanned += filings.length;

  const queue = await listedNewFilings(filings);
  for (const entry of queue.slice(0, maxFilings)) {
    try {
      const item = await filingToNewsItem(entry);
      if (!item) continue;
      const saved = await persistNormalizedItem(item);
      if (saved.skipped) results.skipped += 1;
      else if (saved.duplicate) results.duplicates += 1;
      else results.inserted += 1;
    } catch (error) {
      results.errors.push(`${entry.accessionNumber}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (opts?.includeOptionalSources) {
    for (const adapter of enabledNewsAdapters()) {
      try {
        const items = await adapter.fetchLatest();
        results.scanned += items.length;
        for (const item of items.slice(0, 10)) {
          const saved = await persistNormalizedItem(item);
          if (saved.skipped) results.skipped += 1;
          else if (saved.duplicate) results.duplicates += 1;
          else results.inserted += 1;
        }
      } catch (error) {
        results.errors.push(`${adapter.id}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  }

  return results;
}

async function listedNewFilings(filings: SecFeedEntry[]): Promise<SecFeedEntry[]> {
  const accessions = filings.map((f) => f.accessionNumber);
  const existing = new Set<string>();
  if (accessions.length) {
    const rows = await getDb()
      .select({ accessionNumber: schema.news.accessionNumber })
      .from(schema.news)
      .where(inArray(schema.news.accessionNumber, accessions));
    for (const row of rows) {
      if (row.accessionNumber) existing.add(row.accessionNumber);
    }
  }

  const listed: SecFeedEntry[] = [];
  for (const entry of filings) {
    if (existing.has(entry.accessionNumber)) continue;
    const mapped = await resolveTicker(entry.cik);
    if (!(await isSp500OrNasdaq(mapped?.ticker ?? null))) continue;
    listed.push(entry);
  }

  listed.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return listed;
}
