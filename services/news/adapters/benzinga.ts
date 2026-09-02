import { getEnv } from "@/lib/env";
import type { NormalizedNewsItem } from "@/lib/types";
import type { NewsAdapter } from "@/services/news/types";

export const benzingaAdapter: NewsAdapter = {
  id: "benzinga",
  enabled: () => Boolean(getEnv().benzingaApiKey),
  async fetchLatest(): Promise<NormalizedNewsItem[]> {
    const { benzingaApiKey } = getEnv();
    if (!benzingaApiKey) return [];
    const channels = ["breaking-news", "news", "press-releases", "wiim", "analyst-ratings"];
    const items: NormalizedNewsItem[] = [];
    const retrievedAt = new Date();
    for (const channel of channels) {
      try {
        const url = `https://api.benzinga.com/api/v2/news?token=${encodeURIComponent(benzingaApiKey)}&pageSize=20&displayOutput=full&sort=created:desc`;
        const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const rows = (await res.json()) as Array<{
          title?: string;
          created?: string;
          url?: string;
          teaser?: string;
          body?: string;
          stocks?: Array<{ name?: string }>;
        }>;
        for (const row of Array.isArray(rows) ? rows : []) {
          const ticker = row.stocks?.[0]?.name?.toUpperCase() ?? null;
          items.push({
            source: "benzinga",
            sourceUrl: row.url ?? `https://www.benzinga.com/${channel}`,
            publishedAt: row.created ? new Date(row.created) : retrievedAt,
            retrievedAt,
            ticker,
            company: null,
            cik: null,
            headline: row.title ?? "Untitled Benzinga item",
            summary: row.teaser ?? null,
            originalText: row.body ?? row.teaser ?? null,
            formType: null,
            accessionNumber: null,
            documentUrl: row.url ?? null,
            category: channel,
          });
        }
      } catch {
        continue;
      }
    }
    return items;
  },
};
