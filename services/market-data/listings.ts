const NASDAQ_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const SP500_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv";

let cache: { tickers: Set<string>; loadedAt: number } | null = null;
const TTL_MS = 12 * 60 * 60 * 1000;

function norm(ticker: string): string {
  return ticker.trim().toUpperCase().replace(".", "-");
}

async function loadNasdaq(): Promise<Set<string>> {
  const res = await fetch(NASDAQ_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`NASDAQ list failed ${res.status}`);
  const text = await res.text();
  const tickers = new Set<string>();
  for (const line of text.split("\n").slice(1)) {
    if (!line || line.startsWith("File Creation")) continue;
    const [symbol, , , testIssue] = line.split("|");
    if (!symbol || testIssue === "Y") continue;
    tickers.add(norm(symbol));
  }
  return tickers;
}

async function loadSp500(): Promise<Set<string>> {
  const res = await fetch(SP500_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`S&P 500 list failed ${res.status}`);
  const text = await res.text();
  const tickers = new Set<string>();
  for (const line of text.split("\n").slice(1)) {
    const symbol = line.split(",")[0];
    if (!symbol) continue;
    tickers.add(norm(symbol));
  }
  return tickers;
}

export async function loadListedUniverse(): Promise<Set<string>> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.tickers;
  const [nasdaq, sp500] = await Promise.all([loadNasdaq(), loadSp500()]);
  const tickers = new Set<string>([...nasdaq, ...sp500]);
  cache = { tickers, loadedAt: Date.now() };
  return tickers;
}

export async function isSp500OrNasdaq(ticker: string | null | undefined): Promise<boolean> {
  if (!ticker) return false;
  try {
    const universe = await loadListedUniverse();
    const t = norm(ticker);
    return universe.has(t) || universe.has(t.replace("-", "."));
  } catch {
    return false;
  }
}
