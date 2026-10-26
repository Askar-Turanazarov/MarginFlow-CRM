"use client";

import type { EmployeeStatus, ZoneKind } from "@prisma/client";
import { BoxSelect, ImageUp, Info, MousePointer2, RotateCcw, SquarePlus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Field, SubmitButton } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { useOfficePresence } from "@/components/presence";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { EASE_OUT, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { SimulationToggle } from "../_simulation/simulation-toggle";
import {
  deleteDesk,
  deleteZone,
  moveDesk,
  resetPlan,
  saveDesk,
  saveZone,
  uploadPlan,
  type PlanResult,
} from "./actions";

export type DeskView = {
  id: string;
  code: string;
  pcNumber: string | null;
  x: number;
  y: number;
  employee: { id: string; name: string; position: string; status: EmployeeStatus } | null;
};
export type ZoneView = { id: string; name: string; kind: ZoneKind; x: number; y: number; width: number; height: number };
export type EmployeeOption = { id: string; name: string; deskCode: string | null };

type Mode = "select" | "desk" | "zone";
type Rect = { x: number; y: number; width: number; height: number };
type Selection =
  | { type: "desk"; id: string }
  | { type: "newDesk"; x: number; y: number }
  | { type: "zone"; id: string }
  | { type: "newZone"; rect: Rect }
  | null;

const ZONE_KINDS: ZoneKind[] = ["KITCHEN", "MEETING_ROOM", "LOUNGE", "RECEPTION", "OTHER"];
const ZONE_COLORS: Record<ZoneKind, string> = {
  KITCHEN: "border-sig-out/45 bg-sig-out/[.08] text-sig-out",
  MEETING_ROOM: "border-sig-info/45 bg-sig-info/[.08] text-sig-info",
  LOUNGE: "border-sig-in/45 bg-sig-in/[.08] text-sig-in",
  RECEPTION: "border-sig-violet/45 bg-sig-violet/[.08] text-sig-violet",
  OTHER: "border-sig-off/45 bg-sig-off/[.08] text-sig-off",
};
// Filled with the status signal; a free desk is an empty dashed outline.
const DESK_COLORS: Record<EmployeeStatus | "FREE", string> = {
  IN_OFFICE: "border-transparent bg-sig-in text-primary-foreground",
  OUT_OF_OFFICE: "border-transparent bg-sig-out text-primary-foreground",
  OFF_DUTY: "border-transparent bg-sig-off text-primary-foreground",
  FREE: "border-dashed border-sig-off/70 bg-card text-muted-foreground",
};
const MODE_ICONS = { select: <MousePointer2 />, desk: <SquarePlus />, zone: <BoxSelect /> };

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const MIN_ZONE = 0.02;
const box = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` });

function rectFrom(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function nextDeskCode(desks: DeskView[]) {
  const max = Math.max(0, ...desks.map((d) => Number.parseInt(d.code, 10)).filter(Number.isFinite));
  return String(max + 1).padStart(2, "0");
}

type Props = {
  desks: DeskView[];
  zones: ZoneView[];
  employees: EmployeeOption[];
  imageUrl: string;
  isTestPlan: boolean;
  canEdit: boolean;
};

export function OfficePlanEditor({ desks, zones, employees, imageUrl, isTestPlan, canEdit }: Props) {
  const t = useTranslations();
  const toast = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [selection, setSelection] = useState<Selection>(null);
  // Desk being dragged, and positions already sent to the server but not yet refreshed.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const [draft, setDraft] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [pending, startTransition] = useTransition();
  const [planError, setPlanError] = useState<string | null>(null);
  const presence = useOfficePresence();

  /** Pointer position as shares (0..1) of the plan image. */
  const pointAt = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };

  const positionOf = (d: DeskView) => (drag?.id === d.id ? drag : (moved[d.id] ?? d));

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelection(null);
  };

  // --- background: place desks, draw zones, clear selection
  const onOverlayDown = (e: React.PointerEvent) => {
    if (!canEdit) return setSelection(null);
    const p = pointAt(e);
    if (mode === "desk") setSelection({ type: "newDesk", ...p });
    else if (mode === "zone") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraft({ start: p, end: p });
    } else setSelection(null);
  };
  const onOverlayMove = (e: React.PointerEvent) => {
    if (draft) setDraft({ ...draft, end: pointAt(e) });
  };
  const onOverlayUp = () => {
    if (!draft) return;
    const rect = rectFrom(draft.start, draft.end);
    setDraft(null);
    if (rect.width >= MIN_ZONE && rect.height >= MIN_ZONE) setSelection({ type: "newZone", rect });
  };

  // --- desks: click to select, drag to move (admin, select mode)
  const onDeskDown = (e: React.PointerEvent, desk: DeskView) => {
    e.stopPropagation();
    if (!canEdit || mode !== "select") return setSelection({ type: "desk", id: desk.id });
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = positionOf(desk);
    const start = pointAt(e);
    setDrag({ id: desk.id, x: p.x, y: p.y, startX: start.x - p.x, startY: start.y - p.y });
  };
  const onDeskMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = pointAt(e);
    setDrag({ ...drag, x: clamp(p.x - drag.startX), y: clamp(p.y - drag.startY) });
  };
  const onDeskUp = (desk: DeskView) => {
    if (!drag) return;
    const from = moved[desk.id] ?? desk;
    const distance = Math.hypot(drag.x - from.x, drag.y - from.y);
    const { id, x, y } = drag;
    setDrag(null);
    if (distance < 0.004) return setSelection({ type: "desk", id });
    setMoved((m) => ({ ...m, [id]: { x, y } }));
    startTransition(async () => {
      await moveDesk(id, x, y);
      setMoved((m) => {
        const rest = { ...m };
        delete rest[id];
        return rest;
      });
    });
  };

  const draftRect = draft && rectFrom(draft.start, draft.end);
  const selectedDesk = selection?.type === "desk" ? desks.find((d) => d.id === selection.id) : undefined;
  const selectedZone = selection?.type === "zone" ? zones.find((z) => z.id === selection.id) : undefined;
  const hint = !canEdit ? "hintView" : mode === "desk" ? "hintDesk" : mode === "zone" ? "hintZone" : "hintSelect";
  const done = (message: string) => () => {
    setSelection(null);
    toast.add({ title: message, type: "success" });
  };

  async function upload(file: File) {
    setPlanError(null);
    if (file.size > 5 * 1024 * 1024) return setPlanError(t("officePlan.errors.fileSize"));
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await uploadPlan(formData);
      if (result.error) setPlanError(t(`officePlan.errors.${result.error}`));
      else toast.add({ title: t("officePlan.uploaded"), type: "success" });
    });
  }

  // The side panel: what is selected right now (grows in, keyed by the selection).
  const panelKey = selectedDesk?.id ?? selectedZone?.id ?? selection?.type ?? "none";
  const panel =
    selectedDesk && !canEdit ? (
      <DeskInfo desk={selectedDesk} />
    ) : canEdit && (selectedDesk || selection?.type === "newDesk") ? (
      <DeskForm
        key={selectedDesk?.id ?? `new-${selection?.type === "newDesk" ? `${selection.x},${selection.y}` : ""}`}
        desk={selectedDesk}
        position={selectedDesk ? positionOf(selectedDesk) : (selection as { x: number; y: number })}
        defaultCode={nextDeskCode(desks)}
        employees={employees}
        onCancel={() => setSelection(null)}
        onSaved={done(t("officePlan.saved"))}
        onDeleted={done(t("officePlan.deleted"))}
      />
    ) : canEdit && (selectedZone || selection?.type === "newZone") ? (
      <ZoneForm
        key={selectedZone?.id ?? "new-zone"}
        zone={selectedZone}
        rect={selectedZone ?? (selection as { rect: Rect }).rect}
        onCancel={() => setSelection(null)}
        onSaved={done(t("officePlan.saved"))}
        onDeleted={done(t("officePlan.deleted"))}
      />
    ) : null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-3">
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2" role="toolbar">
            <Segmented
              value={mode}
              onChange={switchMode}
              label={t("officePlan.tools")}
              className="max-sm:w-full"
              options={(["select", "desk", "zone"] as const).map((m) => ({
                value: m,
                icon: MODE_ICONS[m],
                label: <span className="max-sm:sr-only">{t(`officePlan.mode${m[0].toUpperCase()}${m.slice(1)}`)}</span>,
              }))}
            />
            <div className="ml-auto">
              <SimulationToggle enabled={!!presence.data?.simulation} />
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hint}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="flex items-start gap-1.5 text-sm text-muted-foreground"
          >
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {t(`officePlan.${hint}`)}
          </motion.p>
        </AnimatePresence>

        {/* Everything on top of the image is positioned in % of its size, so it scales with the picture. */}
        <div className="glass rounded-[1.4rem] p-1.5">
          <div className="relative isolate overflow-hidden rounded-2xl bg-white select-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain image: served from our API with auth */}
            <img
              src={imageUrl}
              alt={t("officePlan.title")}
              className="block h-auto w-full dark:brightness-[.86] dark:contrast-[.95]"
              draggable={false}
            />
            <div
              ref={overlayRef}
              data-testid="plan-overlay"
              className={cn("absolute inset-0", canEdit && mode !== "select" && "cursor-crosshair touch-none")}
              onPointerDown={onOverlayDown}
              onPointerMove={onOverlayMove}
              onPointerUp={onOverlayUp}
            >
              {zones.map((z) => (
                <div
                  key={z.id}
                  data-testid="zone"
                  className={cn(
                    "absolute rounded-lg border-[1.5px] p-1.5 text-[11px] font-semibold tracking-wide transition-[box-shadow,background-color] duration-200",
                    ZONE_COLORS[z.kind],
                    canEdit && mode === "select" ? "cursor-pointer hover:bg-current/[.12]" : "pointer-events-none",
                    selectedZone?.id === z.id && "ring-2 ring-primary ring-offset-1",
                  )}
                  style={box(z)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelection({ type: "zone", id: z.id });
                  }}
                >
                  {z.name}
                </div>
              ))}

              {(draftRect ?? (selection?.type === "newZone" && selection.rect)) && (
                <div
                  className="pointer-events-none absolute rounded-lg border-2 border-dashed border-primary bg-primary/10"
                  style={box(draftRect ?? (selection as { rect: Rect }).rect)}
                />
              )}

              {desks.map((d) => {
                const p = positionOf(d);
                const dragging = drag?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    data-testid="desk"
                    data-code={d.code}
                    title={[d.code, d.pcNumber, d.employee?.name ?? t("officePlan.free")].filter(Boolean).join(" · ")}
                    className={cn(
                      "nums absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-[1.5px] text-[11px] font-semibold outline-none",
                      "shadow-[inset_0_1px_0_rgb(255_255_255/.3),0_1px_2px_rgb(0_0_0/.18),0_3px_8px_-3px_rgb(0_0_0/.25)] focus-visible:ring-3 focus-visible:ring-ring/50",
                      // Soft landing after a drag; follows the pointer exactly while dragging.
                      dragging
                        ? "z-20 scale-115 shadow-[0_10px_24px_-6px_rgb(0_0_0/.4)] [transition:scale_.25s_var(--ease-spring)]"
                        : "[transition:left_.45s_var(--ease-spring),top_.45s_var(--ease-spring),scale_.3s_var(--ease-spring),box-shadow_.2s]",
                      DESK_COLORS[d.employee?.status ?? "FREE"],
                      canEdit && mode === "select" && "cursor-grab touch-none hover:scale-110 active:cursor-grabbing",
                      canEdit && mode === "zone" && "pointer-events-none",
                      selectedDesk?.id === d.id && "ring-3 ring-primary/70 ring-offset-2",
                    )}
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                    onPointerDown={(e) => onDeskDown(e, d)}
                    onPointerMove={onDeskMove}
                    onPointerUp={() => onDeskUp(d)}
                  >
                    {d.code}
                  </button>
                );
              })}
              {/* People in the office right now; moves every 3 s with the simulator or sensors. */}
              {presence.data?.office.map((p) => (
                <span
                  key={p.id}
                  data-testid="person"
                  title={p.name}
                  className="pointer-events-none absolute z-10 rounded-full shadow-[0_2px_6px_-1px_rgb(0_0_0/.35)] ring-2 ring-white transition-[left,top,transform] duration-[2800ms] ease-linear dark:ring-white/80"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    // Sitting at the desk: shifted to its corner so the desk code stays readable.
                    transform: p.moving ? "translate(-50%, -50%)" : "translate(-5%, -95%)",
                  }}
                >
                  <Avatar id={p.id} name={p.name} size="xs" />
                </span>
              ))}
              {selection?.type === "newDesk" && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={spring.snappy}
                  className="pointer-events-none absolute -mt-4 -ml-4 flex size-8 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/15 text-sm font-semibold text-primary"
                  style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%` }}
                >
                  +
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <Legend />
      </div>

      <div className="grid gap-4 lg:sticky lg:top-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {panel && (
            <motion.div
              key={panelKey}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
              transition={spring.smooth}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>{t("officePlan.upload")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {isTestPlan && <p className="text-muted-foreground">{t("officePlan.testPlan")}</p>}
              <label
                className={cn(
                  "inset-well flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-5 text-center transition-colors hover:border-primary/50 hover:text-foreground focus-within:ring-3 focus-within:ring-ring/40",
                  pending && "pointer-events-none opacity-60",
                )}
              >
                <ImageUp className="size-5 text-muted-foreground" />
                <span className="font-medium">{pending ? t("officePlan.uploading") : t("officePlan.chooseFile")}</span>
                <span className="text-xs text-muted-foreground">{t("officePlan.uploadHint")}</span>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={t("officePlan.upload")}
                  disabled={pending}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {planError && <p className="text-xs text-destructive">{planError}</p>}
              {!isTestPlan && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => startTransition(async () => void (await resetPlan()))}
                >
                  <RotateCcw />
                  {t("officePlan.useTestPlan")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Legend() {
  const t = useTranslations();
  const items: [keyof typeof DESK_COLORS, string][] = [
    ["IN_OFFICE", t("status.IN_OFFICE")],
    ["OUT_OF_OFFICE", t("status.OUT_OF_OFFICE")],
    ["OFF_DUTY", t("status.OFF_DUTY")],
    ["FREE", t("officePlan.free")],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map(([key, label]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded-[5px] border-[1.5px]", DESK_COLORS[key])} />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-3.5 rounded-full bg-[oklch(0.85_0.06_200)] ring-2 ring-white shadow dark:ring-white/80" />
        {t("officePlan.personNow")}
      </span>
    </div>
  );
}

function DeskInfo({ desk }: { desk: DeskView }) {
  const t = useTranslations("officePlan");
  return (
    <Card data-testid="desk-info">
      <CardHeader>
        <CardTitle>{t("editDesk", { code: desk.code })}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {desk.employee ? (
          <div className="flex items-center gap-3">
            <Avatar id={desk.employee.id} name={desk.employee.name} size="md" />
            <div className="min-w-0">
              <div className="font-medium">{desk.employee.name}</div>
              <div className="text-xs text-muted-foreground">{desk.employee.position}</div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">{t("free")}</div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {desk.employee && <StatusBadge status={desk.employee.status} />}
          {desk.pcNumber && (
            <span className="nums text-xs text-muted-foreground">
              {t("pc")}: {desk.pcNumber}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function useResult(onSaved: () => void, onDeleted: () => void) {
  const t = useTranslations("officePlan.errors");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PlanResult>({});
  const run = (action: () => Promise<PlanResult>, deleting = false) =>
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (!r.error && !r.fieldErrors) (deleting ? onDeleted : onSaved)();
    });
  const message = (key?: string) => key && t(key);
  return { pending, run, result, message };
}

type PanelProps = { onCancel: () => void; onSaved: () => void; onDeleted: () => void };

function PanelActions({
  pending,
  onCancel,
  deleteTitle,
  onDelete,
}: {
  pending: boolean;
  onCancel: () => void;
  deleteTitle?: string;
  onDelete?: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
      <SubmitButton pending={pending}>{pending ? t("common.saving") : t("common.save")}</SubmitButton>
      <Button type="button" variant="ghost" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
      {onDelete && deleteTitle && (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" size="icon" className="ml-auto" disabled={pending} aria-label={t("common.delete")}>
              <Trash2 />
            </Button>
          }
          title={deleteTitle}
          confirmLabel={t("common.delete")}
          tone="destructive"
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function DeskForm(
  props: { desk?: DeskView; position: { x: number; y: number }; defaultCode: string; employees: EmployeeOption[] } & PanelProps,
) {
  const { desk, position, defaultCode, employees, onCancel, onSaved, onDeleted } = props;
  const t = useTranslations();
  const { pending, run, result, message } = useResult(onSaved, onDeleted);
  const [code, setCode] = useState(desk?.code ?? defaultCode);
  const [pcNumber, setPcNumber] = useState(desk ? (desk.pcNumber ?? "") : `PC-${defaultCode}`);
  const [employeeId, setEmployeeId] = useState(desk?.employee?.id ?? "");

  return (
    <Card data-testid="desk-form">
      <CardHeader>
        <CardTitle>{desk ? t("officePlan.editDesk", { code: desk.code }) : t("officePlan.newDesk")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveDesk({ id: desk?.id, code, pcNumber, employeeId, x: position.x, y: position.y }));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("officePlan.deskNumber")} htmlFor="desk-code" error={message(result.fieldErrors?.code)}>
              <Input id="desk-code" value={code} onChange={(e) => setCode(e.target.value)} className="nums" required autoFocus={!desk} />
            </Field>
            <Field label={t("officePlan.pcNumber")} htmlFor="desk-pc" error={message(result.fieldErrors?.pcNumber)}>
              <Input id="desk-pc" value={pcNumber} placeholder="PC-07" onChange={(e) => setPcNumber(e.target.value)} className="nums" />
            </Field>
          </div>
          <Field label={t("officePlan.employee")} htmlFor="desk-employee" error={message(result.error)}>
            <NativeSelect id="desk-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{t("officePlan.noEmployee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.deskCode && e.deskCode !== desk?.code ? ` — ${t("officePlan.sitsAt", { code: e.deskCode })}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <PanelActions
            pending={pending}
            onCancel={onCancel}
            deleteTitle={desk && t("officePlan.deleteDesk", { code: desk.code })}
            onDelete={desk && (() => run(() => deleteDesk(desk.id), true))}
          />
        </form>
      </CardContent>
    </Card>
  );
}

function ZoneForm({ zone, rect, onCancel, onSaved, onDeleted }: { zone?: ZoneView; rect: Rect } & PanelProps) {
  const t = useTranslations();
  const { pending, run, result, message } = useResult(onSaved, onDeleted);
  const [name, setName] = useState(zone?.name ?? "");
  const [kind, setKind] = useState<ZoneKind>(zone?.kind ?? "OTHER");

  return (
    <Card data-testid="zone-form">
      <CardHeader>
        <CardTitle>{zone ? t("officePlan.editZone") : t("officePlan.newZone")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveZone({ id: zone?.id, name, kind, x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
          }}
        >
          <Field label={t("officePlan.zoneKind")} htmlFor="zone-kind">
            <NativeSelect
              id="zone-kind"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as ZoneKind;
                // Suggest the type name while the name is empty or still the previous suggestion.
                if (!name || name === t(`zoneKind.${kind}`)) setName(t(`zoneKind.${next}`));
                setKind(next);
              }}
            >
              {ZONE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`zoneKind.${k}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("officePlan.zoneName")} htmlFor="zone-name" error={message(result.fieldErrors?.name ?? result.error)}>
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <PanelActions
            pending={pending}
            onCancel={onCancel}
            deleteTitle={zone && t("officePlan.deleteZone", { name: zone.name })}
            onDelete={zone && (() => run(() => deleteZone(zone.id), true))}
          />
        </form>
      </CardContent>
    </Card>
  );
}
