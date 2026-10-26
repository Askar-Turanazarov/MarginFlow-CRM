import { AuthError } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/auth";
import { routing } from "@/i18n/routing";
import { DEV_LOGIN_ENABLED, isLocalHost } from "@/lib/dev-login";

// TEMPORARY, `npm run dev` only: GET /api/dev-login?as=olivia.bennett&locale=ru&to=/office-plan
// signs in without a password and opens the page. Used for quick checks in the browser.
export async function GET(request: NextRequest) {
  if (!DEV_LOGIN_ENABLED || !isLocalHost(request.headers.get("host"))) {
    return new NextResponse(null, { status: 404 });
  }
  const params = request.nextUrl.searchParams;
  const locale = routing.locales.find((l) => l === params.get("locale")) ?? routing.defaultLocale;
  // Only paths inside the site, so the link cannot send anyone to another domain.
  const to = /^\/[a-z0-9\-/]*$/i.test(params.get("to") ?? "") ? params.get("to") : "/dashboard";

  try {
    await signIn("dev-login", { login: params.get("as") ?? "", redirectTo: `/${locale}${to}` });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "unknownLogin" }, { status: 400 });
    }
    throw error; // the redirect after a successful sign-in is thrown too
  }
}
