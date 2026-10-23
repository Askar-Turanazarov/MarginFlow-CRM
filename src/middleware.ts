import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Only locale routing here. Access checks run on the server (src/lib/session.ts).
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
