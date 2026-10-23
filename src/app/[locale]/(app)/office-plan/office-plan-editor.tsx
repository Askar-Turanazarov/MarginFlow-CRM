"use client";

import type { EmployeeStatus, ZoneKind } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  KITCHEN: "border-orange-500 bg-orange-400/15 text-orange-800",
  MEETING_ROOM: "border-blue-500 bg-blue-400/15 text-blue-800",
  LOUNGE: "border-emerald-500 bg-emerald-400/15 text-emerald-800",
  RECEPTION: "border-purple-500 bg-purple-400/15 text-purple-800",
  OTHER: "border-slate-500 bg-slate-400/15 text-slate-700",
};
const DESK_COLORS: Record<EmployeeStatus | "FREE", string> = {
  IN_OFFICE: "border-emerald-700 bg-emerald-500 text-white",
  OUT_OF_OFFICE: "border-amber-600 bg-amber-400 text-amber-950",
  OFF_DUTY: "border-slate-600 bg-slate-400 text-white",
  FREE: "border-dashed border-slate-500 bg-white text-slate-600",
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const MIN_ZONE = 0.02;

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [selection, setSelection] = useState<Selection>(null);
  // Desk being dragged, and positions already sent to the server but not yet refreshed.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const [draft, setDraft] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [pending, startTransition] = useTransition();
  const [planError, setPlanError] = useState<string | null>(null);

  /** Pointer position as shares (0..1) of the plan image. */
  const pointAt = (e: React.PointerEvent) => {
    const box = overlayRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - box.left) / box.width), y: clamp((e.clientY - box.top) / box.height) };
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

  async function upload(file: File) {
    setPlanError(null);
    if (file.size > 5 * 1024 * 1024) return setPlanError(t("officePlan.errors.fileSize"));
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await uploadPlan(formData);
      if (result.error) setPlanError(t(`officePlan.errors.${result.error}`));
    });
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-2">
        {canEdit && (
          <div className="flex flex-wrap gap-1" role="toolbar">
            {(["select", "desk", "zone"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? "default" : "outline"}
                onClick={() => switchMode(m)}
              >
                {t(`officePlan.mode${m[0].toUpperCase()}${m.slice(1)}`)}
              </Button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{t(`officePlan.${hint}`)}</p>

        {/* Everything on top of the image is positioned in % of its size, so it scales with the picture. */}
        <div className="relative overflow-hidden rounded-xl border bg-white select-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- plain image: served from our API with auth */}
          <img src={imageUrl} alt={t("officePlan.title")} className="block h-auto w-full" draggable={false} />
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
                  "absolute rounded-md border-2 p-1 text-xs font-medium",
                  ZONE_COLORS[z.kind],
                  canEdit && mode === "select" ? "cursor-pointer" : "pointer-events-none",
                  selectedZone?.id === z.id && "ring-2 ring-primary",
                )}
                style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.width * 100}%`, height: `${z.height * 100}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelection({ type: "zone", id: z.id });
                }}
              >
                {z.name}
              </div>
            ))}

            {draftRect && (
              <div
                className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: `${draftRect.x * 100}%`,
                  top: `${draftRect.y * 100}%`,
                  width: `${draftRect.width * 100}%`,
                  height: `${draftRect.height * 100}%`,
                }}
              />
            )}
            {selection?.type === "newZone" && (
              <div
                className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: `${selection.rect.x * 100}%`,
                  top: `${selection.rect.y * 100}%`,
                  width: `${selection.rect.width * 100}%`,
                  height: `${selection.rect.height * 100}%`,
                }}
              />
            )}

            {desks.map((d) => {
              const p = positionOf(d);
              return (
                <button
                  key={d.id}
                  type="button"
                  data-testid="desk"
                  data-code={d.code}
                  title={[d.code, d.pcNumber, d.employee?.name ?? t("officePlan.free")].filter(Boolean).join(" · ")}
                  className={cn(
                    "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 text-[11px] font-semibold shadow-sm",
                    DESK_COLORS[d.employee?.status ?? "FREE"],
                    canEdit && mode === "select" && "cursor-grab touch-none active:cursor-grabbing",
                    canEdit && mode === "zone" && "pointer-events-none",
                    selectedDesk?.id === d.id && "ring-3 ring-primary ring-offset-1",
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
            {selection?.type === "newDesk" && (
              <div
                className="pointer-events-none absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/20 text-xs font-semibold"
                style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%` }}
              >
                +
              </div>
            )}
          </div>
        </div>

        <Legend />
      </div>

      <div className="grid gap-4">
        {selectedDesk && !canEdit && <DeskInfo desk={selectedDesk} />}
        {canEdit && (selectedDesk || selection?.type === "newDesk") && (
          <DeskForm
            key={selectedDesk?.id ?? `new-${selection?.type === "newDesk" ? `${selection.x},${selection.y}` : ""}`}
            desk={selectedDesk}
            position={selectedDesk ? positionOf(selectedDesk) : (selection as { x: number; y: number })}
            defaultCode={nextDeskCode(desks)}
            employees={employees}
            onDone={() => setSelection(null)}
          />
        )}
        {canEdit && (selectedZone || selection?.type === "newZone") && (
          <ZoneForm
            key={selectedZone?.id ?? "new-zone"}
            zone={selectedZone}
            rect={selectedZone ?? (selection as { rect: Rect }).rect}
            onDone={() => setSelection(null)}
          />
        )}

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>{t("officePlan.upload")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {isTestPlan && <p className="text-muted-foreground">{t("officePlan.testPlan")}</p>}
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label={t("officePlan.upload")}
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">{t("officePlan.uploadHint")}</p>
              {pending && <p className="text-xs">{t("officePlan.uploading")}</p>}
              {planError && <p className="text-xs text-destructive">{planError}</p>}
              {!isTestPlan && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => startTransition(async () => void (await resetPlan()))}
                >
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
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map(([key, label]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded border-2", DESK_COLORS[key])} />
          {label}
        </span>
      ))}
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
      <CardContent className="grid gap-2 text-sm">
        {desk.pcNumber && (
          <div>
            <span className="text-muted-foreground">{t("pc")}: </span>
            {desk.pcNumber}
          </div>
        )}
        {desk.employee ? (
          <>
            <div className="font-medium">{desk.employee.name}</div>
            <div className="text-muted-foreground">{desk.employee.position}</div>
            <StatusBadge status={desk.employee.status} />
          </>
        ) : (
          <div className="text-muted-foreground">{t("free")}</div>
        )}
      </CardContent>
    </Card>
  );
}

function useResult(onDone: () => void) {
  const t = useTranslations("officePlan.errors");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PlanResult>({});
  const run = (action: () => Promise<PlanResult>) =>
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (!r.error && !r.fieldErrors) onDone();
    });
  const message = (key?: string) => key && <p className="text-xs text-destructive">{t(key)}</p>;
  return { pending, run, result, message };
}

function DeskForm(props: {
  desk?: DeskView;
  position: { x: number; y: number };
  defaultCode: string;
  employees: EmployeeOption[];
  onDone: () => void;
}) {
  const { desk, position, defaultCode, employees, onDone } = props;
  const t = useTranslations();
  const { pending, run, result, message } = useResult(onDone);
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
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveDesk({ id: desk?.id, code, pcNumber, employeeId, x: position.x, y: position.y }));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="desk-code">{t("officePlan.deskNumber")}</Label>
              <Input id="desk-code" value={code} onChange={(e) => setCode(e.target.value)} required />
              {message(result.fieldErrors?.code)}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desk-pc">{t("officePlan.pcNumber")}</Label>
              <Input id="desk-pc" value={pcNumber} placeholder="PC-07" onChange={(e) => setPcNumber(e.target.value)} />
              {message(result.fieldErrors?.pcNumber)}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desk-employee">{t("officePlan.employee")}</Label>
            <NativeSelect id="desk-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{t("officePlan.noEmployee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.deskCode && e.deskCode !== desk?.code ? ` — ${t("officePlan.sitsAt", { code: e.deskCode })}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          {message(result.error)}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDone}>
              {t("common.cancel")}
            </Button>
            {desk && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="ml-auto"
                disabled={pending}
                onClick={() => run(() => deleteDesk(desk.id))}
              >
                {t("common.delete")}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ZoneForm({ zone, rect, onDone }: { zone?: ZoneView; rect: Rect; onDone: () => void }) {
  const t = useTranslations();
  const { pending, run, result, message } = useResult(onDone);
  const [name, setName] = useState(zone?.name ?? "");
  const [kind, setKind] = useState<ZoneKind>(zone?.kind ?? "OTHER");

  return (
    <Card data-testid="zone-form">
      <CardHeader>
        <CardTitle>{zone ? t("officePlan.editZone") : t("officePlan.newZone")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveZone({ id: zone?.id, name, kind, x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="zone-kind">{t("officePlan.zoneKind")}</Label>
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
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="zone-name">{t("officePlan.zoneName")}</Label>
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {message(result.fieldErrors?.name)}
          </div>
          {message(result.error)}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDone}>
              {t("common.cancel")}
            </Button>
            {zone && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="ml-auto"
                disabled={pending}
                onClick={() => run(() => deleteZone(zone.id))}
              >
                {t("common.delete")}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
