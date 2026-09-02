import { getEnv } from "@/lib/env";

const MIN_INTERVAL_MS = 120;
let lastRequestAt = 0;

async function respectRateLimit() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export async function secFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await respectRateLimit();
  const { secUserAgent } = getEnv();
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": secUserAgent,
      Accept: "application/json, application/atom+xml, application/xml, text/html, */*",
      "Accept-Encoding": "gzip, deflate",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`SEC request failed ${response.status} for ${url}`);
  }
  return response;
}

export async function secFetchText(url: string): Promise<string> {
  const res = await secFetch(url);
  return res.text();
}

export async function secFetchJson<T>(url: string): Promise<T> {
  const res = await secFetch(url);
  return res.json() as Promise<T>;
}
