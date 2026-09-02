# Market Impact

PWA that detects, classifies, and alerts on **high-impact US equity news**. It is a market-moving event detector, not a generic news reader.

## What ships in the MVP

- SEC EDGAR ingestion (8-K, 6-K, 10-Q, 10-K, S-3, 424B5, 13D/G, Form 4)
- Ticker ↔ CIK mapping
- Dedup across sources
- Event + sentiment classification by **financial effect**, not press-release tone
- Impact Score 0–100 with a visible breakdown
- Materiality vs revenue / market cap when those figures exist
- Offering, contract, and Form 4 analyzers
- Live, Today, SEC, Watchlist, and news detail
- Web Push (optional VAPID keys)
- Adapters ready for Benzinga, GlobeNewswire, Business Wire, PR Newswire

No invented news, numbers, or corporate relationships. Missing facts are labeled **Not disclosed**, **Unknown**, or **ESTIMATED**.

## Stack

Next.js · TypeScript · Tailwind CSS · PostgreSQL/Supabase · Vercel

```
app/                         UI + API routes
frontend/                    React components
backend/                     ingest, queries, watchlist
services/sec                 EDGAR client, ticker map, parsers
services/news                optional newswire adapters
services/classification      event, sentiment, score, LLM, dedup
services/notifications       web push
services/market-data         SEC company facts + optional Polygon
database/                    Drizzle schema + SQL
```

API keys never leave the server. Keys live in `.env`.

## Setup

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL` — Postgres / Supabase / Neon
- `SEC_USER_AGENT` — must include a contact email (SEC fair access)

Optional:

- `OPENAI_API_KEY` — narrative only, after the original filing/article is retrieved
- `POLYGON_API_KEY` — last price / market cap
- `BENZINGA_API_KEY`, wire RSS URLs
- VAPID keys for push: `npx web-push generate-vapid-keys`

Local database:

```bash
docker compose up -d
psql "$DATABASE_URL" -f database/schema.sql
# or: npm run db:push
```

Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and tap **Scan SEC**.

Ingest from the CLI:

```bash
npm run ingest:sec
```

Vercel Cron hits `/api/cron/ingest` once a day at 12:00 UTC (8:00 AM ET). While the app is open it also polls SEC every 30 seconds. Set `CRON_SECRET` and send `Authorization: Bearer $CRON_SECRET`.

## Rules the product will not break

- Do not invent news, figures, contracts, or affiliations
- Do not emit price predictions (“this stock will rise 20%”)
- An upbeat offering headline is still dilution
- Form 4 grants and 10b5-1 sales are not treated as open-market conviction buys
- Duplicate events collapse to one card with combined sources
