"use client";

import type { EmployeeStatus, ExitReason } from "@prisma/client";
import { Briefcase, Coffee, Loader2, LogOut, MoreHorizontal, Power, Undo2, User, Users, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { fieldClass } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { EASE_OUT, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { endDay, exitOffice, returnToOffice, type AttendanceState } from "./actions";
import { dayButtonClass, EndDayButton } from "./attendance-buttons";

export type DayState = { status: EmployeeStatus; reason: ExitReason | null; open: boolean };
export type MyRequest = { id: string; title: string; client: string };

type Choice = ExitReason | "END_OF_DAY";

const CHOICES: { value: Choice; icon: LucideIcon; tone: string }[] = [
  { value: "LUNCH", icon: Coffee, tone: "text-sig-out bg-sig-out/12" },
  { value: "CLIENT_VISIT", icon: Briefcase, tone: "text-sig-info bg-sig-info/12" },
  { value: "MEETING", icon: Users, tone: "text-sig-violet bg-sig-violet/12" },
  { value: "PERSONAL", icon: User, tone: "text-sig-off bg-sig-off/12" },
  { value: "OTHER", icon: MoreHorizontal, tone: "text-sig-off bg-sig-off/12" },
  { value: "END_OF_DAY", icon: Power, tone: "text-sig-late bg-sig-late/12" },
];

const LOCATION_EVERY_MS = 60_000;

/** One point from the browser, only if the user allowed it. The server refuses points outside the workday. */
function sendLocation() {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      void fetch("/api/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positions: [{ geo: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy } }] }),
      }).catch(() => {});
    },
    () => {},
    { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 },
  );
}

/** While out of the office, the last point is refreshed once a minute — only if permission is already granted. */
export function ShareLocationWhileOut({ out }: { out: boolean }) {
  useShareLocationWhileOut(out);
  return null;
}

function useShareLocationWhileOut(out: boolean) {
  useEffect(() => {
    if (!out || !navigator.permissions) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (p.state !== "granted") return;
        sendLocation();
        timer = setInterval(sendLocation, LOCATION_EVERY_MS);
      })
      .catch(() => {});
    return () => clearInterval(timer);
  }, [out]);
}

function useDayAction() {
  const t = useTranslations("attendance");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<AttendanceState>, success: string, after?: () => void) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const { error } = await action();
        toast.add({ title: error ? t(`errors.${error}`) : success, type: error ? "error" : "success" });
        if (!error) after?.();
        resolve(!error);
      }),
    );
  return { pending, run };
}

/** "Going out": the window grows out of the button; reason tiles, a request for client visits, a comment for "other". */
export function ExitDialog({ requests, trigger }: { requests: MyRequest[]; trigger?: React.ReactElement }) {
  const t = useTranslations("attendance");
  const tr = useTranslations("exitReason");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [requestId, setRequestId] = useState("");
  const [comment, setComment] = useState("");
  const { pending, run } = useDayAction();

  useEffect(() => {
    if (!open) {
      setChoice(null);
      setRequestId("");
      setComment("");
    }
  }, [open]);

  const needsComment = choice === "OTHER" && !comment.trim();
  const submit = async () => {
    if (!choice || needsComment) return;
    const ok =
      choice === "END_OF_DAY"
        ? await run(endDay, t("toast.dayEnded"))
        : await run(
            () => exitOffice({ reason: choice, requestId: requestId || null, comment: comment || null }),
            t("toast.exited", { reason: tr(choice) }),
            sendLocation,
          );
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="lg" variant="outline" data-testid="exit-button">
              <LogOut />
              {t("exit")}
            </Button>
          )
        }
      />
      <DialogContent title={t("exitTitle")} description={t("exitHint")} className="max-w-lg">
        <div role="radiogroup" aria-label={t("exitTitle")} className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHOICES.map(({ value, icon: Icon, tone }) => {
            const active = choice === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                data-reason={value}
                onClick={() => setChoice(value)}
                className={cn(
                  "relative flex flex-col items-start gap-2.5 rounded-2xl border p-3 text-left text-sm font-medium outline-none [transition:transform_.4s_var(--ease-spring),border-color_.2s,background-color_.2s] focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[.97]",
                  active ? "border-primary/50 bg-primary/8" : "border-border bg-card/60 hover:-translate-y-px hover:bg-card",
                )}
              >
                {active && (
                  <motion.span layoutId="exit-choice" transition={spring.snappy} className="absolute inset-0 rounded-2xl ring-2 ring-primary/60" />
                )}
                <span className={cn("flex size-9 items-center justify-center rounded-xl", tone)}>
                  <Icon className="size-[18px]" />
                </span>
                {tr(value)}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {choice === "CLIENT_VISIT" && (
            <Reveal key="req">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{t("pickRequest")}</span>
                <NativeSelect value={requestId} onChange={(e) => setRequestId(e.target.value)} data-testid="exit-request">
                  <option value="">{t("noRequest")}</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} · {r.client}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </Reveal>
          )}
          {choice === "OTHER" && (
            <Reveal key="comment">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{t("comment")}</span>
                <textarea
                  autoFocus
                  rows={2}
                  maxLength={300}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("commentPlaceholder")}
                  className={cn(fieldClass, "h-auto min-h-16 resize-none py-2.5")}
                  data-testid="exit-comment"
                />
              </label>
            </Reveal>
          )}
          {choice === "END_OF_DAY" && (
            <Reveal key="end">
              <p className="rounded-xl bg-sig-late/8 px-3.5 py-2.5 text-sm text-sig-late">{t("endDayConfirm")}</p>
            </Reveal>
          )}
        </AnimatePresence>

        {choice && choice !== "END_OF_DAY" && <p className="mt-4 text-xs text-muted-foreground">{t("geoNote")}</p>}

        <div className="mt-5 flex justify-end gap-2 max-sm:flex-col-reverse">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            variant={choice === "END_OF_DAY" ? "destructive" : "default"}
            disabled={!choice || needsComment || pending}
            onClick={submit}
            data-testid="exit-confirm"
          >
            {pending && <Loader2 className="animate-spin" />}
            {choice === "END_OF_DAY" ? t("endDay") : t("confirmExit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="overflow-hidden"
    >
      <div className="pt-4">{children}</div>
    </motion.div>
  );
}

export function ReturnButton({ className }: { className?: string }) {
  const t = useTranslations("attendance");
  const { pending, run } = useDayAction();
  return (
    <Button
      size="lg"
      className={cn(dayButtonClass, className)}
      disabled={pending}
      onClick={() => run(returnToOffice, t("toast.returned"))}
      data-testid="return-button"
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : <Undo2 className="size-5" />}
      {t("back")}
    </Button>
  );
}

/** The day's actions for the current status: in the office — go out / end the day; outside — come back / end the day. */
export function DayControls({ state, requests }: { state: DayState; requests: MyRequest[] }) {
  const tr = useTranslations("exitReason");
  const t = useTranslations("attendance");
  const out = state.open && state.status === "OUT_OF_OFFICE";
  if (!state.open) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {out ? (
        <>
          <ReturnButton />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sig-out/12 px-3 py-1 text-sm font-medium text-sig-out" data-testid="out-reason">
            <span className="size-1.5 rounded-full bg-current" />
            {t("outNow")}
            {state.reason && ` · ${tr(state.reason)}`}
          </span>
        </>
      ) : (
        <ExitDialog requests={requests} />
      )}
      <EndDayButton />
    </div>
  );
}

/** Compact day action for the sidebar and the phone: always in the same place. */
export function QuickDayAction({ state, requests }: { state: DayState; requests: MyRequest[] }) {
  const t = useTranslations("attendance");
  const out = state.open && state.status === "OUT_OF_OFFICE";
  if (!state.open) return null;
  return out ? (
    <ReturnButton className="h-11 w-full rounded-xl px-4 text-sm" />
  ) : (
    <ExitDialog
      requests={requests}
      trigger={
        <Button variant="glass" className="w-full" data-testid="quick-exit">
          <LogOut />
          {t("exit")}
        </Button>
      }
    />
  );
}
