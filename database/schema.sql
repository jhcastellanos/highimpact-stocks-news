-- MARKET IMPACT schema for PostgreSQL / Supabase
-- Run in the SQL editor if you are not using drizzle-kit push.

create extension if not exists "pgcrypto";

create table if not exists companies (
  ticker text primary key,
  company_name text not null,
  cik text not null,
  sector text,
  industry text,
  market_cap numeric,
  annual_revenue numeric,
  shares_outstanding numeric,
  last_price numeric,
  market_data_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists companies_cik_idx on companies (cik);

create table if not exists news (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  ticker text,
  company text,
  headline text not null,
  summary text,
  original_text text,
  primary_source text not null,
  source_url text not null,
  published_at timestamptz not null,
  retrieved_at timestamptz not null,
  form_type text,
  accession_number text,
  document_url text,
  created_at timestamptz not null default now()
);
create unique index if not exists news_fingerprint_idx on news (fingerprint);
create unique index if not exists news_accession_idx on news (accession_number);
create index if not exists news_published_idx on news (published_at);
create index if not exists news_ticker_idx on news (ticker);

create table if not exists news_sources (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references news(id) on delete cascade,
  source text not null,
  source_url text not null,
  published_at timestamptz not null
);
create unique index if not exists news_sources_unique on news_sources (news_id, source);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references news(id) on delete cascade,
  event_type text not null,
  sentiment text not null,
  impact_score integer not null,
  impact_band text not null,
  confidence real not null,
  event_importance integer not null,
  financial_materiality integer not null,
  company_size_effect integer not null,
  source_confidence integer not null,
  event_novelty integer not null,
  market_reaction_potential integer not null,
  expected_market_effect text
);
create unique index if not exists events_news_id_idx on events (news_id);
create index if not exists events_score_idx on events (impact_score);

create table if not exists analysis (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references news(id) on delete cascade,
  why_it_matters text not null,
  key_factors jsonb not null,
  risks jsonb not null,
  materiality text not null,
  time_horizon text not null,
  key_numbers jsonb not null,
  contract_json jsonb,
  offering_json jsonb,
  form4_kind text,
  llm_used boolean not null default false
);
create unique index if not exists analysis_news_id_idx on analysis (news_id);

create table if not exists sec_filings (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  cik text not null,
  form text not null,
  accession_number text not null,
  filing_date text,
  acceptance_datetime timestamptz,
  document_url text not null,
  news_id uuid references news(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists sec_filings_accession_idx on sec_filings (accession_number);
create index if not exists sec_filings_form_idx on sec_filings (form);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  ticker text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists watchlists_user_ticker_idx on watchlists (user_id, ticker);

create table if not exists alert_settings (
  user_id text primary key,
  min_impact_score integer not null default 70,
  watchlist_always boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists push_endpoint_idx on push_subscriptions (endpoint);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  ticker text,
  news_id uuid not null references news(id) on delete cascade,
  sent_at timestamptz not null default now()
);
create unique index if not exists alerts_user_news_idx on alerts (user_id, news_id);
