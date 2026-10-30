"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = { value: T; label?: React.ReactNode; title?: string; icon?: React.ReactNode };

/** Recessed track with a glass runner that slides between options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "default",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("inset-well inline-flex rounded-xl p-[3px]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            aria-label={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-[9px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                className="lens absolute inset-0 rounded-[9px] bg-card shadow-[0_1px_2px_rgb(0_0_0/.1),0_2px_6px_-2px_rgb(0_0_0/.12),inset_0_1px_0_var(--glass-hi)]"
              />
            )}
            <span className="relative flex items-center gap-1.5 xl:whitespace-nowrap [&_svg]:size-3.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
