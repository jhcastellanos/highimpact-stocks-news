"use client";

import { useI18n } from "@/frontend/i18n/LocaleProvider";

export function LoadingLabel() {
  const { t } = useI18n();
  return <div className="text-sm text-mute">{t("loading")}</div>;
}
