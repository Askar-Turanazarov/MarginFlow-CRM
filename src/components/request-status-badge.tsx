import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  NEW: "bg-sky-100 text-sky-800",
  ASSIGNED: "bg-violet-100 text-violet-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DONE: "bg-emerald-100 text-emerald-800",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations("requestStatus");
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", REQUEST_STATUS_COLORS[status])}>
      {t(status)}
    </span>
  );
}
