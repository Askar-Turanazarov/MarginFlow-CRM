"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const textareaClass = cn(fieldClass, "h-auto min-h-20 resize-y py-2.5 leading-relaxed");

/** Label above the field, the error (or a hint) right under it; the error slides in instead of jumping. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </motion.p>
        ) : (
          hint && (
            <p key="hint" className="text-xs text-muted-foreground">
              {hint}
            </p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

/** A titled group of fields inside one form card. */
export function FormSection({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("grid gap-4", className)}>
      {title && <legend className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>}
      {children}
    </fieldset>
  );
}

/** Form-level error: one calm line with an icon, not a red wall. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      {children}
    </p>
  );
}

/** Save button: the icon morphs from a check to a spinner while the form is being sent. */
export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="min-w-32">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={pending ? "pending" : "idle"}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
        </motion.span>
      </AnimatePresence>
      {children}
    </Button>
  );
}

/** Actions at the end of a form; on phones the buttons share the full width (big thumb targets). */
export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-5 max-sm:[&>*]:flex-1">{children}</div>
  );
}
