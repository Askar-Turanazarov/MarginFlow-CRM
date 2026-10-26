// TEMPORARY quick login for local testing: sign in as a demo user without a password.
// Works only under `npm run dev` and only when the site is opened as localhost — never in a production build.
// To remove: delete this file, the "dev-login" provider in src/auth.ts, src/app/api/dev-login and the block on the login page.

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export const DEV_LOGIN_ENABLED = process.env.NODE_ENV === "development";

/** `host` header without the port is a local address. */
export function isLocalHost(host: string | null | undefined): boolean {
  return !!host && LOCAL_HOSTS.includes(host.replace(/:\d+$/, ""));
}
