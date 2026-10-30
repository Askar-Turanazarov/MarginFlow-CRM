import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { DEV_LOGIN_ENABLED, isLocalHost } from "@/lib/dev-login";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, resetLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface User {
    sessionVersion?: number;
  }
}

const credentialsSchema = z.object({
  login: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(128),
});

const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPTS_PER_IP = 30;

// Compared against when the login does not exist, so response time does not reveal valid logins.
const DUMMY_HASH = bcrypt.hashSync("marginflow-dummy-password", 10);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/en/login" },
  providers: [
    Credentials({
      credentials: { login: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Counted per login + IP, not per login alone: nobody can lock another person out. Checked before bcrypt, which is slow on purpose.
        const ip = clientIp(request.headers);
        const attemptKey = `login:${ip}:${parsed.data.login}`;
        if (!(await hit(`login-ip:${ip}`, LOGIN_ATTEMPTS_PER_IP, LOGIN_WINDOW_MS))) return null;
        if (!(await hit(attemptKey, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS))) return null;

        const user = await prisma.user.findUnique({
          where: { login: parsed.data.login },
          include: { employee: true },
        });
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid || !user.isActive) return null;
        await resetLimit(attemptKey);

        return { id: user.id, name: `${user.employee.firstName} ${user.employee.lastName}`, sessionVersion: user.sessionVersion };
      },
    }),
    // TEMPORARY, `npm run dev` only (see src/lib/dev-login.ts): quick login by login name, no password.
    ...(DEV_LOGIN_ENABLED
      ? [
          Credentials({
            id: "dev-login",
            credentials: { login: {} },
            async authorize(raw, request) {
              // This provider answers on /api/auth/callback/dev-login too: without this check a tunnel would let anyone in.
              if (!isLocalHost(request.headers.get("host"))) return null;
              const login = z.string().trim().toLowerCase().min(1).safeParse(raw?.login);
              if (!login.success) return null;
              const user = await prisma.user.findUnique({ where: { login: login.data }, include: { employee: true } });
              if (!user?.isActive) return null;
              return { id: user.id, name: `${user.employee.firstName} ${user.employee.lastName}`, sessionVersion: user.sessionVersion };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sessionVersion = user.sessionVersion;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.sessionVersion = token.sessionVersion as number | undefined;
      return session;
    },
  },
});
