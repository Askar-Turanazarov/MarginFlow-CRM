"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const useToast = Toast.useToastManager;

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const TONES = { success: "text-sig-in", error: "text-sig-late", info: "text-sig-info" } as const;

/**
 * Non-blocking notifications, bottom-right, stacked like a deck of cards;
 * hovering expands the deck, swipe or ✕ closes. New ones rise from below.
 */
export function Toaster() {
  const { toasts } = Toast.useToastManager();
  const t = useTranslations("common");

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60] w-[min(22rem,calc(100vw-2rem))] max-lg:bottom-24">
        {toasts.map((toast) => {
          const type = (toast.type as keyof typeof ICONS) ?? "info";
          const Icon = ICONS[type] ?? Info;
          return (
            <Toast.Root
              key={toast.id}
              toast={toast}
              swipeDirection={["right", "down"]}
              className={cn(
                "glass-overlay absolute right-0 bottom-0 w-full origin-bottom rounded-2xl p-3.5 pr-10 select-none",
                "[--gap:0.625rem] [--peek:0.6rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))]",
                "[--height:var(--toast-frontmost-height,var(--toast-height))] h-(--height) data-expanded:h-(--toast-height)",
                "z-[calc(1000-var(--toast-index))]",
                "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
                "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)*-1-(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y)))]",
                "[transition:transform_0.6s_var(--ease-spring-soft),opacity_0.35s,height_0.2s]",
                "data-starting-style:[transform:translateY(130%)] data-ending-style:opacity-0 data-limited:opacity-0",
                "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
              )}
            >
              <Toast.Content className="flex gap-3 overflow-hidden transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100">
                <Icon className={cn("mt-0.5 size-5 shrink-0", TONES[type])} />
                <div className="min-w-0">
                  <Toast.Title className="text-sm font-medium" />
                  <Toast.Description className="text-sm text-muted-foreground" />
                </div>
                <Toast.Close
                  aria-label={t("close")}
                  className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </Toast.Close>
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
