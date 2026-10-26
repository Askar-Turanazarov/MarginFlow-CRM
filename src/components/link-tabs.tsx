"use client";

import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type LinkTab = { key: string; href: React.ComponentProps<typeof Link>["href"]; label: React.ReactNode; count?: number };

/**
 * Filter tabs that are links (the filter lives in the URL). Same recessed track and sliding glass runner
 * as `Segmented`; the runner moves on click, before the new page arrives.
 */
export function LinkTabs({ tabs, active, label }: { tabs: LinkTab[]; active: string; label: string }) {
  const id = useId();
  const [current, setCurrent] = useState(active);
  useEffect(() => setCurrent(active), [active]);

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="inset-well inline-flex rounded-xl p-[3px]">
        {tabs.map((tab) => {
          const on = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              scroll={false}
              onClick={() => setCurrent(tab.key)}
              aria-current={tab.key === active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`tabs-${id}`}
                  transition={spring.snappy}
                  className="lens absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_2px_rgb(0_0_0/.1),0_2px_6px_-2px_rgb(0_0_0/.12),inset_0_1px_0_var(--glass-hi)]"
                />
              )}
              <span className="relative">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "nums relative min-w-5 rounded-full px-1.5 text-center text-xs transition-colors",
                    on ? "bg-primary/12 text-primary" : "bg-foreground/7",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
