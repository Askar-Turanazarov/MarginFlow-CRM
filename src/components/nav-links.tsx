"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm hover:bg-muted",
            pathname.startsWith(link.href) && "bg-muted font-medium",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
