"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/**
 * Recessed track + raised glass knob with a liquid lens. While pressed the knob
 * stretches a little (like iOS), then springs to the other side.
 */
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group/switch inset-well relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring/45",
        "data-checked:bg-primary data-checked:shadow-[inset_0_1px_2px_rgb(0_0_0/.25)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "lens block h-[22px] w-[22px] rounded-full bg-white/80 shadow-[0_1px_1px_rgb(0_0_0/.12),0_3px_8px_-2px_rgb(0_0_0/.3),inset_0_1px_0_rgb(255_255_255/.9)] dark:bg-white/90",
          "[transition:translate_.5s_var(--ease-spring),width_.25s_var(--ease-out-soft),margin_.25s_var(--ease-out-soft)]",
          "data-checked:translate-x-5 group-active/switch:w-[27px] data-checked:group-active/switch:-ml-[5px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
