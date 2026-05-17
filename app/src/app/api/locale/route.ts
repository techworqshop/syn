import { NextResponse } from "next/server";
import { COOKIE_NAME, isLocale } from "@/lib/i18n";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = body?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,  // 1 Jahr
    sameSite: "lax",
    httpOnly: false,             // damit client-side ggf. lesen kann (für SSR-Hydration)
    secure: true
  });
  return res;
}
