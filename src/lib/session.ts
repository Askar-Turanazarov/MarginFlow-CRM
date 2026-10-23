import type { Role } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

// The role is read from the database on every request, so role changes and deactivation apply at once.
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { desk: true } } },
  });
  return user?.isActive ? user : null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Redirects to login if not signed in, and to the dashboard if the role is not allowed. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) return redirect({ href: "/login", locale });
  if (roles && !roles.includes(user.role)) return redirect({ href: "/dashboard", locale });
  return user;
}
