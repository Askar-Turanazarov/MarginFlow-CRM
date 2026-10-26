"use client";

import { motion } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

// Moving between sections: the new page dissolves in while rising 8 px.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}
