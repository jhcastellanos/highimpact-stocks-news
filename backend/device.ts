import { cookies } from "next/headers";
import { DEVICE_COOKIE } from "@/lib/device-cookie";

export { DEVICE_COOKIE };

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(DEVICE_COOKIE, id, {
    ...COOKIE_OPTS,
    secure: process.env.NODE_ENV === "production",
  });
  return id;
}

export async function requireDeviceId(): Promise<string> {
  const id = await getDeviceId();
  if (!id) throw new Error("Missing device cookie");
  return id;
}
