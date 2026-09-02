import { persistNormalizedItem } from "@/backend/persist";
import { enabledNewsAdapters } from "@/services/news/registry";
import { fetchRecentSecFilings, fetchTodaysPriorityFilings, filingToNewsItem } from "@/services/sec/ingest";

export async function runIngest(opts?: { maxFilings?: number; includeOptionalSources?: boolean }) {
  const maxFilings = opts?.maxFilings ?? 8;
  const results = {
    scanned: 0,
    inserted: 0,
    duplicates: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const live = await fetchRecentSecFilings(undefined, 40);
  const today = await fetchTodaysPriorityFilings();
  const catalyst = new Set(["8-K", "8-K/A", "6-K", "10-Q", "10-K", "424B5", "S-3", "S-3ASR", "SC 13D", "SC 13D/A"]);
  const filings = [...today, ...live]
    .filter((e, i, arr) => arr.findIndex((x) => x.accessionNumber === e.accessionNumber) === i)
    .sort((a, b) => {
      const aCat = catalyst.has(a.form.toUpperCase()) ? 1 : 0;
      const bCat = catalyst.has(b.form.toUpperCase()) ? 1 : 0;
      if (aCat !== bCat) return bCat - aCat;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });
  results.scanned += filings.length;

  for (const entry of filings.slice(0, maxFilings)) {
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
