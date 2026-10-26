"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** A number that rolls to its new value on a spring instead of jumping. */
export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const unsub = mv.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
    const controls = animate(mv, value, reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 });
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, value, reduced]);

  return (
    <span ref={ref} className={cn("nums", className)}>
      {value}
    </span>
  );
}
