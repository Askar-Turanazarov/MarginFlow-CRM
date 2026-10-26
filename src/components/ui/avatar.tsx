import { hueOf, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base" } as const;

/**
 * Initials on a soft personal colour (same person — same colour everywhere).
 * An optional status ring tells where the person is; the dot "breathes" while in the office.
 */
export function Avatar({
  id,
  name,
  size = "sm",
  status,
  className,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  status?: "in" | "out" | "off";
  className?: string;
}) {
  const hue = hueOf(id);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight select-none",
        "bg-[oklch(0.9_0.05_var(--hue))] text-[oklch(0.38_0.09_var(--hue))] shadow-[inset_0_1px_0_rgb(255_255_255/.5),inset_0_-1px_2px_rgb(0_0_0/.06)]",
        "dark:bg-[oklch(0.38_0.06_var(--hue))] dark:text-[oklch(0.92_0.04_var(--hue))] dark:shadow-[inset_0_1px_0_rgb(255_255_255/.1)]",
        SIZES[size],
        className,
      )}
      style={{ "--hue": hue } as React.CSSProperties}
      aria-hidden
    >
      {initialsOf(name)}
      {status && (
        <span
          className={cn(
            "absolute -right-px -bottom-px size-[32%] min-h-2 min-w-2 rounded-full ring-2 ring-card",
            status === "in" && "animate-breathe bg-sig-in text-sig-in",
            status === "out" && "bg-sig-out",
            status === "off" && "bg-sig-off",
          )}
        />
      )}
    </span>
  );
}
