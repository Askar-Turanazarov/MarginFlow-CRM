import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Pressing physics: the button sinks (scale + 1px), its shadow tightens, then springs back.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-sm font-medium whitespace-nowrap outline-none select-none [transition:transform_.45s_var(--ease-spring),box-shadow_.25s_var(--ease-out-soft),background-color_.2s,color_.2s,opacity_.2s,filter_.2s] focus-visible:ring-3 focus-visible:ring-ring/45 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[.97] active:not-aria-[haspopup]:duration-75 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Raised emerald: light from above, soft coloured shadow below.
        default:
          "bg-primary bg-[linear-gradient(180deg,rgb(255_255_255/.16),transparent_55%)] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/.28),inset_0_-1px_0_rgb(0_0_0/.12),0_1px_2px_rgb(0_0_0/.12),0_6px_14px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)] hover:brightness-[1.06] hover:shadow-[inset_0_1px_0_rgb(255_255_255/.3),inset_0_-1px_0_rgb(0_0_0/.12),0_1px_2px_rgb(0_0_0/.12),0_10px_22px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] active:shadow-[inset_0_1px_2px_rgb(0_0_0/.2),0_1px_1px_rgb(0_0_0/.1)]",
        glass: "glass text-foreground hover:-translate-y-px",
        outline:
          "border-border bg-card/70 shadow-[0_1px_1px_rgb(0_0_0/.04),inset_0_1px_0_var(--glass-hi)] hover:bg-card hover:text-foreground aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]",
        ghost: "hover:bg-foreground/6 hover:text-foreground aria-expanded:bg-foreground/6",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/18 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 gap-2 px-4 max-md:h-11",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-2xl px-6 text-[0.9375rem]",
        icon: "size-10 max-md:size-11",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
