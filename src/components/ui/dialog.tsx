"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { triggerOffset } from "@/lib/trigger-origin";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const dialogBackdropClass =
  "fixed inset-0 z-50 bg-[rgb(20_18_15/.28)] backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/45";

/** Grows out of the control that opened it and shrinks back into it (spatial memory). */
export const growFromTriggerClass = cn(
  "[transition:transform_.55s_var(--ease-spring-soft),opacity_.25s_var(--ease-out-soft),filter_.3s]",
  "data-starting-style:[transform:translate(var(--from-x),var(--from-y))_scale(.35)] data-starting-style:opacity-0 data-starting-style:blur-[2px]",
  "data-ending-style:[transform:translate(var(--from-x),var(--from-y))_scale(.35)] data-ending-style:opacity-0 data-ending-style:duration-300",
);

/** Ref for the popup: reads the trigger offset once, when the popup mounts. */
export function useTriggerOrigin() {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const { x, y } = triggerOffset();
    el.style.setProperty("--from-x", `${x}px`);
    el.style.setProperty("--from-y", `${y}px`);
  }, []);
}

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "title"> & { title: React.ReactNode; description?: React.ReactNode }) {
  const t = useTranslations("common");
  const origin = useTriggerOrigin();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={dialogBackdropClass} />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center p-4 max-sm:items-end max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <DialogPrimitive.Popup
          ref={origin}
          className={cn("glass-overlay relative w-full max-w-md rounded-3xl p-6 outline-none", growFromTriggerClass, className)}
          {...props}
        >
          <DialogPrimitive.Title className="pr-8 text-lg font-semibold tracking-[-0.01em]">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
          )}
          {children}
          <DialogPrimitive.Close
            aria-label={t("close")}
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

/** Replaces window.confirm: the trigger is rendered by the caller, the action runs on confirm. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "default",
  onConfirm,
}: {
  trigger: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: React.ReactNode;
  tone?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent title={title} description={description} className="max-w-sm">
        <div className="mt-6 flex justify-end gap-2 max-sm:flex-col-reverse">
          <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            autoFocus
            onClick={async () => {
              setOpen(false);
              await onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
