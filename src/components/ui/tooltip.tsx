"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

/** Small glass hint; appears after a calm delay, follows the side it was asked for. */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} delay={350} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-[70]">
          <TooltipPrimitive.Popup
            className={cn(
              "glass-overlay origin-(--transform-origin) rounded-lg px-2.5 py-1.5 text-xs font-medium",
              "[transition:transform_.35s_var(--ease-spring),opacity_.15s] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0",
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
