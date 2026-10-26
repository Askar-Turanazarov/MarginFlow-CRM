import type { Transition } from "motion/react";

/**
 * Motion presets: springs instead of linear curves (mass, stiffness, friction).
 * snappy — buttons, switches, sliding pills; smooth — panels, dialogs; gentle — blocks appearing.
 */
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 32, mass: 0.8 },
  smooth: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 170, damping: 26 },
} satisfies Record<string, Transition>;

/** Non-spring easing: micro 150–200 ms, panels 300–450 ms. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
