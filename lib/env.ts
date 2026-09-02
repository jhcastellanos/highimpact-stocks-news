export function getEnv() {
  return {
    databaseUrl: process.env.DATABASE_URL ?? "",
    secUserAgent:
      process.env.SEC_USER_AGENT ?? "MarketImpact/0.1 (https://github.com/jhcastellanos/highimpact-stocks-news)",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    cronSecret: process.env.CRON_SECRET ?? "",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:alerts@localhost",
    polygonApiKey: process.env.POLYGON_API_KEY ?? "",
    benzingaApiKey: process.env.BENZINGA_API_KEY ?? "",
    benzingaUseWebsocket: process.env.BENZINGA_USE_WEBSOCKET === "true",
    globeNewswireRssUrl: process.env.GLOBENEWSWIRE_RSS_URL ?? "",
    businessWireFeedUrl: process.env.BUSINESSWIRE_FEED_URL ?? "",
    prNewswireFeedUrl: process.env.PRNEWSWIRE_FEED_URL ?? "",
  };
}

export function requireDatabaseUrl(): string {
  const url = getEnv().databaseUrl;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}
