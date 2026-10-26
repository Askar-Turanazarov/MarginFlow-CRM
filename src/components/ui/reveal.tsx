"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

/**
 * A section rises into place the first time it enters the screen:
 * opacity + 12 px + a touch of blur that sharpens. `index` staggers siblings by 40 ms.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.04 }}
    >
      {children}
    </motion.div>
  );
}
