import type { EmployeeStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANT = { IN_OFFICE: "in", OUT_OF_OFFICE: "out", OFF_DUTY: "off" } as const;

// Status is never colour alone: dot + text.
export function StatusBadge({ status }: { status: EmployeeStatus }) {
  const t = useTranslations("status");
  return (
    <Badge variant={VARIANT[status]}>
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "IN_OFFICE" && "animate-breathe",
        )}
      />
      {t(status)}
    </Badge>
  );
}
