"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/frontend/components/LanguageToggle";
import { PushToggle } from "@/frontend/components/PushToggle";
import { RefreshButton } from "@/frontend/components/RefreshButton";
import { LocaleProvider, useI18n } from "@/frontend/i18n/LocaleProvider";
import { startSourcePolling } from "@/frontend/lib/source-poll";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ShellBody>{children}</ShellBody>
    </LocaleProvider>
  );
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const onDetail = pathname.startsWith("/news/");
  const tabs = [
    { href: "/", label: t("live") },
    { href: "/today", label: t("today") },
    { href: "/sec", label: t("sec") },
    { href: "/watchlist", label: t("watchlist") },
  ];

  useEffect(() => {
    fetch("/api/device").catch(() => undefined);
    startSourcePolling();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-5">
      {onDetail ? null : (
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">S&P 500 · NASDAQ</div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Market Impact</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LanguageToggle />
              <PushToggle />
              <RefreshButton />
            </div>
          </div>
          <nav className="flex gap-1 rounded-full border border-line bg-panel/80 p-1">
            {tabs.map((tab) => {
              const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex-1 rounded-full px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] ${
                    active ? "bg-accent text-white" : "text-mute"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>
      )}
      {children}
    </div>
  );
}
