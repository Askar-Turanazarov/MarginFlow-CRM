import type { RequestStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/** Muted signal colours from the theme tokens (no neon); the text always says the status too. */
export const REQUEST_STATUS_VARIANT = {
  NEW: "info",
  ASSIGNED: "violet",
  IN_PROGRESS: "out",
  DONE: "in",
} as const satisfies Record<RequestStatus, string>;

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  NEW: "bg-sig-info/12 text-sig-info",
  ASSIGNED: "bg-sig-violet/12 text-sig-violet",
  IN_PROGRESS: "bg-sig-out/12 text-sig-out",
  DONE: "bg-sig-in/12 text-sig-in",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations("requestStatus");
  return (
    <Badge variant={REQUEST_STATUS_VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  );
}
