import { cookies } from "next/headers";

export const DEVICE_COOKIE = "mi_device";

export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

export async function requireDeviceId(): Promise<string> {
  const id = await getDeviceId();
  if (!id) throw new Error("Missing device cookie");
  return id;
}
