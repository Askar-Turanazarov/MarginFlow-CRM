import type { EmployeeStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const COLORS: Record<EmployeeStatus, string> = {
  IN_OFFICE: "bg-emerald-100 text-emerald-800",
  OUT_OF_OFFICE: "bg-amber-100 text-amber-800",
  OFF_DUTY: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  const t = useTranslations("status");
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", COLORS[status])}>
      {t(status)}
    </span>
  );
}
