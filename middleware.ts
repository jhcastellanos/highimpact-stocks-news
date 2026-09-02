import { NextRequest, NextResponse } from "next/server";
import { DEVICE_COOKIE } from "@/lib/device-cookie";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(DEVICE_COOKIE)) {
    response.cookies.set({
      name: DEVICE_COOKIE,
      value: crypto.randomUUID(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|icons/).*)"],
};
