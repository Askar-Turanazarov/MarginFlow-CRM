"use client";

import { endOfMonth, format, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

type Preset = "thisWeek" | "thisMonth" | "lastMonth" | "custom";

/** Period in office dates (yyyy-MM-dd); `today` comes from the server, already in office time. */
function rangeOf(preset: Exclude<Preset, "custom">, today: string) {
  const day = parseISO(today);
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  if (preset === "thisWeek") return { from: iso(startOfWeek(day, { weekStartsOn: 1 })), to: today };
  if (preset === "thisMonth") return { from: iso(startOfMonth(day)), to: today };
  const last = subMonths(day, 1);
  return { from: iso(startOfMonth(last)), to: iso(endOfMonth(last)) };
}

/** A plain GET form: the browser downloads the .xlsx file. Quick periods fill both dates. */
export function ReportForm({ today, locale }: { today: string; locale: string }) {
  const t = useTranslations("reports");
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [range, setRange] = useState(() => rangeOf("thisMonth", today));

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(rangeOf(p, today));
  };
  const edit = (field: "from" | "to") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset("custom");
    setRange((r) => ({ ...r, [field]: e.target.value }));
  };

  return (
    <form method="get" action="/api/reports/attendance.xlsx" className="grid gap-5" data-testid="report-form">
      <input type="hidden" name="locale" value={locale} />
      <Segmented
        value={preset}
        onChange={choose}
        label={t("period")}
        size="sm"
        className="w-full overflow-x-auto"
        options={(["thisWeek", "thisMonth", "lastMonth", "custom"] as const).map((p) => ({ value: p, label: t(`presets.${p}`) }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("from")} htmlFor="from">
          <Input id="from" name="from" type="date" required value={range.from} max={range.to} onChange={edit("from")} className="nums" />
        </Field>
        <Field label={t("to")} htmlFor="to">
          <Input id="to" name="to" type="date" required value={range.to} min={range.from} onChange={edit("to")} className="nums" />
        </Field>
      </div>
      <div className="border-t border-border/70 pt-5">
        <Button type="submit" size="lg" className="max-sm:w-full">
          <Download />
          {t("download")}
        </Button>
      </div>
    </form>
  );
}
