"use server";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard"
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Falsche Email oder Passwort." };
    throw e;
  }
  return { error: null };
}
