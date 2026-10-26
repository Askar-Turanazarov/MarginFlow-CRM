import { ChevronLeft, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Page title with an optional count, a way back and the page's main actions on the right. */
export function PageHeader({
  title,
  count,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  count?: number;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="group/back -ml-1 mb-1 inline-flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4 transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover/back:-translate-x-0.5" />
            {back.label}
          </Link>
        )}
        <h1 className="flex items-baseline gap-2.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
          {title}
          {count !== undefined && <span className="nums text-lg font-medium text-muted-foreground">{count}</span>}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A friendly empty list instead of a bare "nothing found" row. */
export function EmptyState({ icon: Icon, text, className }: { icon: LucideIcon; text: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground", className)}>
      <span className="inset-well flex size-12 items-center justify-center rounded-2xl">
        <Icon className="size-5" />
      </span>
      {text}
    </div>
  );
}

/**
 * The same list twice: a table from 640 px, cards on phones (no sideways scrolling).
 * Both are plain server markup, so the cost is only a few extra nodes.
 */
export function ResponsiveList({ table, cards, empty }: { table: React.ReactNode; cards: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <Reveal index={2}>
      {empty || (
        <>
          <div className="surface overflow-hidden rounded-2xl max-sm:hidden">{table}</div>
          <ul className="grid gap-2 sm:hidden">{cards}</ul>
        </>
      )}
    </Reveal>
  );
}

/** One phone card of a list. */
export function ListCard({ className, children, ...props }: React.ComponentProps<"li">) {
  return (
    <li className={cn("surface grid gap-3 rounded-2xl p-3.5", className)} {...props}>
      {children}
    </li>
  );
}
