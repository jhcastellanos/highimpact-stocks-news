import { benzingaAdapter } from "@/services/news/adapters/benzinga";
import { businessWireAdapter, globeNewswireAdapter, prNewswireAdapter } from "@/services/news/adapters/wires";
import type { NewsAdapter } from "@/services/news/types";

export const NEWS_ADAPTERS: NewsAdapter[] = [
  benzingaAdapter,
  globeNewswireAdapter,
  businessWireAdapter,
  prNewswireAdapter,
];

export function enabledNewsAdapters(): NewsAdapter[] {
  return NEWS_ADAPTERS.filter((a) => a.enabled());
}
