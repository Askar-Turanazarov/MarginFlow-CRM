"use client";

import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LayoutGrid,
  MapPinned,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { Tooltip } from "@/components/ui/tooltip";
import { Link, usePathname } from "@/i18n/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  employees: Users,
  clients: Building2,
  requests: ClipboardList,
  officePlan: LayoutGrid,
  map: MapPinned,
  reports: FileSpreadsheet,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof NAV_ICONS };

export function useActiveHref(links: NavItem[]) {
  const pathname = usePathname();
  return links.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.href;
}

/** Sidebar navigation: the active "pill" slides between items instead of jumping. */
export function NavLinks({ links, collapsed }: { links: NavItem[]; collapsed: boolean }) {
  const active = useActiveHref(links);

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const Icon = NAV_ICONS[link.icon];
        const isActive = link.href === active;
        const item = (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={collapsed ? link.label : undefined}
            className={cn(
              "group/nav relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive ? "text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-pill"
                transition={spring.smooth}
                className="lens absolute inset-0 rounded-xl bg-card/85 shadow-[0_1px_2px_rgb(0_0_0/.08),0_4px_12px_-4px_rgb(0_0_0/.14),inset_0_1px_0_var(--glass-hi)] dark:bg-white/10"
              />
            )}
            <Icon
              className={cn(
                "relative size-[18px] shrink-0 transition-[color,transform] duration-300 group-hover/nav:scale-105",
                isActive && "text-primary",
              )}
            />
            <span
              className={cn(
                "relative truncate transition-opacity duration-200",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              {link.label}
            </span>
          </Link>
        );
        return collapsed ? (
          <Tooltip key={link.href} content={link.label} side="right">
            {item}
          </Tooltip>
        ) : (
          item
        );
      })}
    </nav>
  );
}
