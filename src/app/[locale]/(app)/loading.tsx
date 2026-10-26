import { Skeleton } from "@/components/ui/skeleton";

// Calm placeholders in the shape of a page instead of an empty screen or a spinner.
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
