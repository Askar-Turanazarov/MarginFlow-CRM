"use server";

import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { signIn, signOut } from "@/auth";
import { routing, type AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type LoginState = { error?: "invalid" };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = await getLocale();
  try {
    await signIn("credentials", {
      login: formData.get("login"),
      password: formData.get("password"),
      redirectTo: `/${locale}/dashboard`,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "invalid" };
    throw error; // the redirect after a successful sign-in is thrown too
  }
  return {};
}

export async function logout() {
  const locale = await getLocale();
  await signOut({ redirectTo: `/${locale}/login` });
}

/** Remembers the chosen language (used later for the Excel report). */
export async function saveLocale(locale: AppLocale) {
  if (!routing.locales.includes(locale)) return;
  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
}
