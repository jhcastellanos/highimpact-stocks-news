import { XMLParser } from "fast-xml-parser";
import { getEnv } from "@/lib/env";
import type { NormalizedNewsItem, SourceId } from "@/lib/types";
import type { NewsAdapter } from "@/services/news/types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function rssAdapter(id: SourceId, urlFromEnv: () => string): NewsAdapter {
  return {
    id,
    enabled: () => Boolean(urlFromEnv()),
    async fetchLatest(): Promise<NormalizedNewsItem[]> {
      const url = urlFromEnv();
      if (!url) return [];
      const retrievedAt = new Date();
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const xml = await res.text();
      const doc = parser.parse(xml);
      const entries = [
        ...asArray(doc.rss?.channel?.item),
        ...asArray(doc.feed?.entry),
      ];
      return entries.slice(0, 40).map((entry: Record<string, unknown>) => {
        const headline = String(entry.title ?? "Untitled");
        const linkRaw = entry.link;
        const sourceUrl =
          typeof linkRaw === "string"
            ? linkRaw
            : (linkRaw as { href?: string } | undefined)?.href ?? url;
        const published = String(entry.pubDate ?? entry.updated ?? entry.published ?? retrievedAt.toISOString());
        const summary = String(entry.description ?? entry.summary ?? "");
        const tickerMatch = `${headline} ${summary}`.match(/\b[A-Z]{1,5}\b/);
        return {
          source: id,
          sourceUrl,
          publishedAt: new Date(published),
          retrievedAt,
          ticker: tickerMatch?.[0] ?? null,
          company: null,
          cik: null,
          headline,
          summary: summary ? summary.replace(/<[^>]+>/g, " ").trim() : null,
          originalText: summary ? summary.replace(/<[^>]+>/g, " ").trim() : null,
          formType: null,
          accessionNumber: null,
          documentUrl: sourceUrl,
          category: String(entry.category ?? id),
        } satisfies NormalizedNewsItem;
      });
    },
  };
}

export const globeNewswireAdapter = rssAdapter("globenewswire", () => getEnv().globeNewswireRssUrl);
export const businessWireAdapter = rssAdapter("businesswire", () => getEnv().businessWireFeedUrl);
export const prNewswireAdapter = rssAdapter("prnewswire", () => getEnv().prNewswireFeedUrl);
