import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { DEV_LOGIN_ENABLED, isLocalHost } from "@/lib/dev-login";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  login: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

// Compared against when the login does not exist, so response time does not reveal valid logins.
const DUMMY_HASH = bcrypt.hashSync("marginflow-dummy-password", 10);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/en/login" },
  providers: [
    Credentials({
      credentials: { login: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { login: parsed.data.login },
          include: { employee: true },
        });
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid || !user.isActive) return null;

        return { id: user.id, name: `${user.employee.firstName} ${user.employee.lastName}` };
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
              return { id: user.id, name: `${user.employee.firstName} ${user.employee.lastName}` };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
