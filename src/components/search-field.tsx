"use client";

import { Loader2, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/** Live search: the list updates while you type (the query stays in the URL, so the page can be shared and reloaded). */
export function SearchField({ placeholder, defaultValue = "", param = "q" }: { placeholder: string; defaultValue?: string; param?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim() === (params.get(param) ?? "")) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      const query = next.toString();
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, params, param, pathname, router]);

  return (
    <form role="search" className="relative w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        type="search"
        name={param}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && (e.preventDefault(), setValue(""))}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className={cn(fieldClass, "pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute top-1/2 right-2 -translate-y-1/2">
        {pending ? (
          <Loader2 className="m-1.5 size-4 animate-spin text-muted-foreground" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => (setValue(""), input.current?.focus())}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground"
              aria-label={t("clear")}
            >
              <X className="size-4" />
            </button>
          )
        )}
      </span>
    </form>
  );
}
