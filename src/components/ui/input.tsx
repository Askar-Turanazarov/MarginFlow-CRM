import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// Slightly recessed field; on focus an emerald rim fades in.
export const fieldClass =
  "inset-well h-10 w-full min-w-0 rounded-xl border border-transparent px-3 text-base transition-[box-shadow,border-color,background-color] duration-200 outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring/60 focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm max-md:h-11"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
