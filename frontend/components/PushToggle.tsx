"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/frontend/i18n/LocaleProvider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<"off" | "on" | "denied" | "missing">("off");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("missing");
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => setState("missing"));
    if (Notification.permission === "denied") setState("denied");
    if (Notification.permission === "granted") setState("on");
  }, []);

  async function enable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      setState("missing");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    setState("on");
  }

  if (state === "on") {
    return <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">{t("alertsOn")}</span>;
  }
  if (state === "denied") {
    return <span className="font-mono text-[10px] uppercase tracking-widest text-neg">{t("notificationsBlocked")}</span>;
  }
  return (
    <button
      onClick={enable}
      className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent"
    >
      {t("enableAlerts")}
    </button>
  );
}
