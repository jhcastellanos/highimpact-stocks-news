import type { NormalizedNewsItem, SourceId } from "@/lib/types";

export type NewsAdapter = {
  id: SourceId;
  enabled: () => boolean;
  fetchLatest: () => Promise<NormalizedNewsItem[]>;
};
