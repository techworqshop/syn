"use server";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export async function loginAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard"
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: t("login.invalid", locale) };
    throw e;
  }
  return { error: null };
}
