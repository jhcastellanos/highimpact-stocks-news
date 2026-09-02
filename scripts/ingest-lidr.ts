import { persistNormalizedItem } from "@/backend/persist";
import { padCik } from "@/lib/format";
import { secFetchJson } from "@/services/sec/client";
import { filingToNewsItem, type SecFeedEntry } from "@/services/sec/ingest";
import { resolveCik } from "@/services/sec/ticker-map";

async function main() {
  const rec = await resolveCik("LIDR");
  console.log("mapped", rec);
  if (!rec) throw new Error("LIDR CIK not found");

  const sub = (await secFetchJson(`https://data.sec.gov/submissions/CIK${rec.cik}.json`)) as {
    filings?: {
      recent?: {
        accessionNumber: string[];
        form: string[];
        filingDate: string[];
        acceptanceDateTime?: string[];
        primaryDocument?: string[];
      };
    };
  };
  const recent = sub.filings?.recent;
  const n = recent?.accessionNumber?.length ?? 0;
  const rows = [];
  for (let i = 0; i < Math.min(n, 12); i++) {
    rows.push({
      form: recent!.form[i],
      accession: recent!.accessionNumber[i],
      filingDate: recent!.filingDate[i],
      acceptance: recent!.acceptanceDateTime?.[i],
    });
  }
  console.log(JSON.stringify(rows, null, 2));

  const hit = rows.find((r) => r.form.startsWith("8-K") && (r.filingDate === "2026-09-01" || r.acceptance?.startsWith("2026-09-01")));
  if (!hit) {
    console.log("No 8-K on 2026-09-01 in recent submissions");
    return;
  }

  const cikNum = rec.cik.replace(/^0+/, "");
  const accNodash = hit.accession.replace(/-/g, "");
  const entry: SecFeedEntry = {
    form: hit.form,
    title: `${hit.form} - ${rec.companyName} (${rec.cik}) (Filer)`,
    companyName: rec.companyName,
    cik: padCik(rec.cik),
    publishedAt: hit.acceptance ? new Date(hit.acceptance) : new Date(`${hit.filingDate}T12:00:00Z`),
    indexUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNodash}/${hit.accession}-index.htm`,
    accessionNumber: hit.accession,
  };
  const item = await filingToNewsItem(entry);
  if (!item) throw new Error("failed to build news item");
  const saved = await persistNormalizedItem(item);
  console.log("saved", saved);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
