import { cn } from "@/lib/utils";

/** Calm placeholder: opacity breathes between 40 and 70 %, no shimmer stripes. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-skeleton rounded-xl bg-foreground/8", className)} {...props} />;
}
