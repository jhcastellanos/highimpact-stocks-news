import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    ticker: text("ticker").primaryKey(),
    companyName: text("company_name").notNull(),
    cik: text("cik").notNull(),
    sector: text("sector"),
    industry: text("industry"),
    marketCap: numeric("market_cap"),
    annualRevenue: numeric("annual_revenue"),
    sharesOutstanding: numeric("shares_outstanding"),
    lastPrice: numeric("last_price"),
    marketDataUpdatedAt: timestamp("market_data_updated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("companies_cik_idx").on(t.cik)],
);

export const news = pgTable(
  "news",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    ticker: text("ticker"),
    company: text("company"),
    headline: text("headline").notNull(),
    summary: text("summary"),
    originalText: text("original_text"),
    primarySource: text("primary_source").notNull(),
    sourceUrl: text("source_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    formType: text("form_type"),
    accessionNumber: text("accession_number"),
    documentUrl: text("document_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("news_fingerprint_idx").on(t.fingerprint),
    uniqueIndex("news_accession_idx").on(t.accessionNumber),
    index("news_published_idx").on(t.publishedAt),
    index("news_ticker_idx").on(t.ticker),
  ],
);

export const newsSources = pgTable(
  "news_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceUrl: text("source_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("news_sources_unique").on(t.newsId, t.source)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sentiment: text("sentiment").notNull(),
    impactScore: integer("impact_score").notNull(),
    impactBand: text("impact_band").notNull(),
    confidence: real("confidence").notNull(),
    eventImportance: integer("event_importance").notNull(),
    financialMateriality: integer("financial_materiality").notNull(),
    companySizeEffect: integer("company_size_effect").notNull(),
    sourceConfidence: integer("source_confidence").notNull(),
    eventNovelty: integer("event_novelty").notNull(),
    marketReactionPotential: integer("market_reaction_potential").notNull(),
    expectedMarketEffect: text("expected_market_effect"),
  },
  (t) => [uniqueIndex("events_news_id_idx").on(t.newsId), index("events_score_idx").on(t.impactScore)],
);

export const analysis = pgTable(
  "analysis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    whyItMatters: text("why_it_matters").notNull(),
    keyFactors: jsonb("key_factors").$type<string[]>().notNull(),
    risks: jsonb("risks").$type<string[]>().notNull(),
    materiality: text("materiality").notNull(),
    timeHorizon: text("time_horizon").notNull(),
    keyNumbers: jsonb("key_numbers").$type<Record<string, unknown>>().notNull(),
    contractJson: jsonb("contract_json"),
    offeringJson: jsonb("offering_json"),
    form4Kind: text("form4_kind"),
    llmUsed: boolean("llm_used").default(false).notNull(),
  },
  (t) => [uniqueIndex("analysis_news_id_idx").on(t.newsId)],
);

export const secFilings = pgTable(
  "sec_filings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticker: text("ticker"),
    cik: text("cik").notNull(),
    form: text("form").notNull(),
    accessionNumber: text("accession_number").notNull(),
    filingDate: text("filing_date"),
    acceptanceDatetime: timestamp("acceptance_datetime", { withTimezone: true }),
    documentUrl: text("document_url").notNull(),
    newsId: uuid("news_id").references(() => news.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sec_filings_accession_idx").on(t.accessionNumber),
    index("sec_filings_form_idx").on(t.form),
  ],
);

export const watchlists = pgTable(
  "watchlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    ticker: text("ticker").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("watchlists_user_ticker_idx").on(t.userId, t.ticker)],
);

export const alertSettings = pgTable("alert_settings", {
  userId: text("user_id").primaryKey(),
  minImpactScore: integer("min_impact_score").default(70).notNull(),
  watchlistAlways: boolean("watchlist_always").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_endpoint_idx").on(t.endpoint)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    ticker: text("ticker"),
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("alerts_user_news_idx").on(t.userId, t.newsId)],
);
