"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ImpactBadge } from "@/frontend/components/ImpactBadge";
import { LanguageToggle } from "@/frontend/components/LanguageToggle";
import { useI18n } from "@/frontend/i18n/LocaleProvider";
import { useTranslatedTexts } from "@/frontend/i18n/useTranslatedTexts";
import {
  classForSentiment,
  eventLabel,
  formatCap,
  form4Label,
  horizonLabel,
  marketEffectLabel,
  sentimentLabel,
  sourceLabel,
} from "@/frontend/lib/labels";
import { formatPct, formatUsd } from "@/lib/format";
import { toEtLabel } from "@/lib/time";
import type { MessageKey } from "@/frontend/i18n/messages";

type Detail = {
  news: {
    id: string;
    ticker: string | null;
    company: string | null;
    headline: string;
    summary: string | null;
    originalText: string | null;
    primarySource: string;
    sourceUrl: string;
    publishedAt: string;
    formType: string | null;
    accessionNumber: string | null;
    documentUrl: string | null;
  };
  events: {
    eventType: string;
    sentiment: string;
    impactScore: number;
    impactBand: string;
    confidence: number;
    eventImportance: number;
    financialMateriality: number;
    companySizeEffect: number;
    sourceConfidence: number;
    eventNovelty: number;
    marketReactionPotential: number;
    expectedMarketEffect: string | null;
  };
  analysis: {
    whyItMatters: string;
    keyFactors: string[];
    risks: string[];
    materiality: string;
    timeHorizon: string;
    keyNumbers: Record<string, unknown>;
    contractJson: Record<string, unknown> | null;
    offeringJson: Record<string, unknown> | null;
    form4Kind: string | null;
  };
  companies: {
    marketCap: string | null;
    annualRevenue: string | null;
    lastPrice: string | null;
    sector: string | null;
    industry: string | null;
  } | null;
  sources: Array<{ source: string; sourceUrl: string }>;
};

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [item, setItem] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/news/${params.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setItem(json.item);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("loadFailed")));
  }, [params.id, t]);

  const goBack = () => (window.history.length > 1 ? router.back() : router.push("/"));

  if (error) {
    return (
      <div>
        <DetailBar onBack={goBack} />
        <div className="mt-4 text-sm text-neg">{error}</div>
      </div>
    );
  }
  if (!item) {
    return (
      <div>
        <DetailBar onBack={goBack} />
        <div className="mt-4 text-sm text-mute">{t("loadingAnalysis")}</div>
      </div>
    );
  }

  return <NewsDetailBody item={item} onBack={goBack} />;
}

function NewsDetailBody({ item, onBack }: { item: Detail; onBack: () => void }) {
  const { locale, t } = useI18n();
  const { news, events, analysis, companies } = item;

  const pack = useMemo(
    () => [
      news.headline,
      news.summary ?? "",
      analysis.whyItMatters,
      analysis.materiality,
      ...analysis.keyFactors,
      ...analysis.risks,
    ],
    [news.headline, news.summary, analysis.whyItMatters, analysis.materiality, analysis.keyFactors, analysis.risks],
  );
  const { texts, pending } = useTranslatedTexts(pack);
  const headline = texts[0] ?? news.headline;
  const summary = texts[1] ?? news.summary ?? "";
  const why = texts[2] ?? analysis.whyItMatters;
  const materiality = texts[3] ?? analysis.materiality;
  const factorStart = 4;
  const factors = analysis.keyFactors.map((f, i) => texts[factorStart + i] ?? f);
  const riskStart = factorStart + analysis.keyFactors.length;
  const risks = analysis.risks.map((f, i) => texts[riskStart + i] ?? f);

  const offering = analysis.offeringJson as {
    amountRaised?: { value: number | null; disclosure: string };
    offeringPctMarketCap?: { value: number | null; disclosure: string };
    estimatedDilutionPct?: { value: number | null; disclosure: string };
  } | null;
  const contract = analysis.contractJson as {
    customer?: string | null;
    contractValue?: { value: number | null };
    contractToRevenuePct?: { value: number | null; disclosure: string };
    isGovernment?: boolean | null;
    isNewCustomer?: boolean | null;
    isNewMarket?: boolean | null;
  } | null;

  const fact = (value: string) => localizeStoredFact(value, t);

  return (
    <article className="space-y-6">
      <DetailBar onBack={onBack} />
      {pending ? <div className="font-mono text-[11px] uppercase tracking-widest text-mute">{t("translating")}</div> : null}
      <header className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-3xl font-semibold tracking-wide">{news.ticker ?? "—"}</div>
            <div className="text-mute">{news.company ?? t("unknownIssuer")}</div>
          </div>
          <ImpactBadge score={events.impactScore} band={events.impactBand} />
        </div>
        <div className={`mt-4 font-mono text-xs uppercase tracking-[0.16em] ${classForSentiment(events.sentiment)}`}>
          {sentimentLabel(events.sentiment, locale)}
        </div>
        <div className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-mute">{eventLabel(events.eventType, locale)}</div>
        <h1 className="mt-3 text-[22px] font-medium leading-snug">{headline}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-mute">
          <span>{item.sources.map((s) => sourceLabel(s.source)).join(" + ") || sourceLabel(news.primarySource)}</span>
          <span>{toEtLabel(news.publishedAt, locale)}</span>
          {news.formType ? <span>{news.formType}</span> : null}
          <span>{formatCap(companies?.marketCap, t("mktCapUnknown"))}</span>
          {companies?.lastPrice ? (
            <span>
              {t("lastPrice")} {formatUsd(Number(companies.lastPrice))}
            </span>
          ) : (
            <span>{t("priceUnknown")}</span>
          )}
        </div>
      </header>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-pos">{t("whyItMatters")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{why}</p>
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("summary")}</h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink">{summary}</p>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("materiality")}</h2>
        <p className="mt-2 text-sm leading-relaxed">{materiality}</p>
      </section>

      {offering ? (
        <section className="rounded-xl border border-neg/30 bg-neg/5 p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neg">{t("offeringAnalyzer")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
            <Fact label={t("amountRaised")} value={fact(factUsd(offering.amountRaised, t))} />
            <Fact label={t("marketCap")} value={formatCap(companies?.marketCap, t("mktCapUnknown"))} />
            <Fact label={t("offeringPctCap")} value={fact(factPct(offering.offeringPctMarketCap, t))} />
            <Fact label={t("potentialDilution")} value={fact(factPct(offering.estimatedDilutionPct, t))} />
          </dl>
        </section>
      ) : null}

      {contract ? (
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("contractAnalyzer")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
            <Fact label={t("customer")} value={contract.customer ?? t("notDisclosed")} />
            <Fact
              label={t("contractValue")}
              value={contract.contractValue?.value ? formatUsd(contract.contractValue.value) : t("notDisclosed")}
            />
            <Fact label={t("vsAnnualRevenue")} value={fact(factPct(contract.contractToRevenuePct, t))} />
            <Fact label={t("government")} value={boolish(contract.isGovernment, t)} />
            <Fact label={t("newCustomer")} value={boolish(contract.isNewCustomer, t)} />
            <Fact label={t("newMarket")} value={boolish(contract.isNewMarket, t)} />
          </dl>
        </section>
      ) : null}

      {analysis.form4Kind ? (
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("form4Analysis")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
            <Fact label={t("kind")} value={form4Label(analysis.form4Kind, locale)} />
            <Fact label={t("insider")} value={fact(String(analysis.keyNumbers.form4Insider ?? t("notDisclosed")))} />
            <Fact label={t("role")} value={fact(String(analysis.keyNumbers.form4Role ?? t("unknown")))} />
            <Fact label={t("shares")} value={fact(String(analysis.keyNumbers.form4Shares ?? t("notDisclosed")))} />
            <Fact label={t("price")} value={fact(String(analysis.keyNumbers.form4Price ?? t("notDisclosed")))} />
            <Fact label={t("value")} value={fact(String(analysis.keyNumbers.form4Value ?? t("notDisclosed")))} />
          </dl>
        </section>
      ) : null}

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("keyFactors")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {factors.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("risks")}</h2>
        <ul className="mt-2 space-y-1 text-sm text-mute">
          {risks.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("expectedMarketEffect")}</h2>
        <p className="mt-2 text-sm">
          {marketEffectLabel(events.expectedMarketEffect ?? "MATERIAL_CATALYST", locale)} — {t("notAPriceTarget")}
        </p>
        <p className="mt-1 text-sm text-mute">
          {t("horizon")}: {horizonLabel(analysis.timeHorizon, locale)}
        </p>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("impactBreakdown")}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
          <Fact label={t("eventImportance")} value={String(events.eventImportance)} />
          <Fact label={t("financialMateriality")} value={String(events.financialMateriality)} />
          <Fact label={t("companySize")} value={String(events.companySizeEffect)} />
          <Fact label={t("sourceConfidence")} value={String(events.sourceConfidence)} />
          <Fact label={t("novelty")} value={String(events.eventNovelty)} />
          <Fact label={t("reactionPotential")} value={String(events.marketReactionPotential)} />
        </dl>
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("sources")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {(item.sources.length ? item.sources : [{ source: news.primarySource, sourceUrl: news.sourceUrl }]).map((s) => (
            <li key={s.sourceUrl}>
              <a className="text-pos underline-offset-2 hover:underline" href={s.sourceUrl} target="_blank" rel="noreferrer">
                {sourceLabel(s.source)}
              </a>
            </li>
          ))}
          {news.documentUrl ? (
            <li>
              <a className="text-pos underline-offset-2 hover:underline" href={news.documentUrl} target="_blank" rel="noreferrer">
                {t("secDocument")}
              </a>
            </li>
          ) : null}
        </ul>
      </section>
    </article>
  );
}

function DetailBar({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white hover:border-accent hover:text-accent"
      >
        ← {t("back")}
      </button>
      <LanguageToggle />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-mute">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function localizeStoredFact(value: string, translate: (key: MessageKey) => string): string {
  if (value === "Not disclosed" || value === "No divulgado") return translate("notDisclosed");
  if (value === "Unknown" || value === "Desconocido") return translate("unknown");
  return value.replace(/^ESTIMATED /, `${translate("estimated")} `).replace(/^ESTIMADO /, `${translate("estimated")} `);
}

function factUsd(f: { value: number | null; disclosure: string } | undefined, translate: (key: MessageKey) => string): string {
  if (!f || f.value == null) return translate("notDisclosed");
  return `${f.disclosure === "estimated" ? `${translate("estimated")} ` : ""}${formatUsd(f.value)}`;
}

function factPct(f: { value: number | null; disclosure?: string } | undefined, translate: (key: MessageKey) => string): string {
  if (!f || f.value == null) return translate("unknown");
  return formatPct(f.value, f.disclosure === "estimated").replace(/^ESTIMATED /, `${translate("estimated")} `);
}

function boolish(v: boolean | null | undefined, translate: (key: MessageKey) => string): string {
  if (v == null) return translate("unknown");
  return v ? translate("yes") : translate("no");
}
