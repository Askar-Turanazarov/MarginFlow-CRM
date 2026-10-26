import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const selectClass = cn(fieldClass, "select-chevron appearance-none pr-9");

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(selectClass, className)} {...props} />;
}
