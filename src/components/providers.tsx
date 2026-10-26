"use client";

import { Toast } from "@base-ui/react/toast";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toast";
import { rememberTrigger } from "@/lib/trigger-origin";

/**
 * One pointer listener for the whole app:
 * - moves the specular sheen of the glass under the cursor (--mx / --my);
 * - remembers which control opened a dialog, so it can grow out of it (spatial memory).
 */
function useGlobalPointer() {
  useEffect(() => {
    // Liquid refraction (SVG displacement in backdrop-filter) renders correctly only in Chromium.
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
    if (brands?.some((b) => b.brand === "Chromium")) document.documentElement.dataset.lens = "";

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = (e.target as Element | null)?.closest?.<HTMLElement>(".glass");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    const onDown = (e: Event) => rememberTrigger(e.target as Element | null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") rememberTrigger(document.activeElement);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("keydown", onKey, { capture: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("keydown", onKey, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useGlobalPointer();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <Toast.Provider limit={4} timeout={4500}>
          {children}
          <Toaster />
        </Toast.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}
