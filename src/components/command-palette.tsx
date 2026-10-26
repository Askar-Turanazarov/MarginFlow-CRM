"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Building2, ClipboardList, Languages, Monitor, Moon, Search, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LOCALE_NAMES, useSwitchLocale } from "@/components/locale-switcher";
import { NAV_ICONS, type NavItem } from "@/components/nav-links";
import { Avatar } from "@/components/ui/avatar";
import { dialogBackdropClass, growFromTriggerClass, useTriggerOrigin } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Hit = { id: string; name: string; hint: string };
type Results = { employees: Hit[]; clients: Hit[]; requests: Hit[] };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const itemClass =
  "flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150 data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";
const groupClass =
  "px-2 pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

/** Ctrl+K: jump to a section, find a person / client / request, switch theme or language. */
export function CommandPalette({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: NavItem[];
}) {
  const t = useTranslations("palette");
  const tTheme = useTranslations("theme");
  const router = useRouter();
  const locale = useLocale();
  const { setTheme } = useTheme();
  const { switchTo } = useSwitchLocale();
  const origin = useTriggerOrigin();
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 180);

  const { data } = useQuery<Results>({
    queryKey: ["search", q],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
    enabled: open && q.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const results = q.length >= 2 ? data : undefined;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className={dialogBackdropClass} />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] max-sm:pt-4">
          <DialogPrimitive.Popup
            ref={origin}
            aria-label={t("title")}
            className={cn("glass-overlay w-full max-w-xl overflow-hidden rounded-3xl outline-none", growFromTriggerClass)}
          >
            <Command shouldFilter={false} loop className="flex max-h-[min(70vh,34rem)] flex-col">
              <div className="flex items-center gap-3 border-b border-border/70 px-5">
                <Search className="size-4.5 shrink-0 text-muted-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t("placeholder")}
                  className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/80"
                />
                <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
                  Esc
                </kbd>
              </div>
              <Command.List className="overflow-y-auto overscroll-contain py-1">
                <Command.Empty className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</Command.Empty>

                {results && results.employees.length > 0 && (
                  <Command.Group heading={t("people")} className={groupClass}>
                    {results.employees.map((e) => (
                      <Command.Item key={e.id} value={`e-${e.id}`} className={itemClass} onSelect={() => run(() => router.push(`/employees/${e.id}`))}>
                        <Avatar id={e.id} name={e.name} size="xs" />
                        <span className="truncate">{e.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{e.hint}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {results && results.clients.length > 0 && (
                  <Command.Group heading={t("clients")} className={groupClass}>
                    {results.clients.map((c) => (
                      <Command.Item key={c.id} value={`c-${c.id}`} className={itemClass} onSelect={() => run(() => router.push(`/clients/${c.id}`))}>
                        <Building2 />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{c.hint}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {results && results.requests.length > 0 && (
                  <Command.Group heading={t("requests")} className={groupClass}>
                    {results.requests.map((r) => (
                      <Command.Item key={r.id} value={`r-${r.id}`} className={itemClass} onSelect={() => run(() => router.push(`/requests/${r.id}`))}>
                        <ClipboardList />
                        <span className="truncate">{r.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{r.hint}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {!results && (
                  <>
                    <Command.Group heading={t("goTo")} className={groupClass}>
                      {links.map((l) => {
                        const Icon = NAV_ICONS[l.icon];
                        return (
                          <Command.Item key={l.href} value={l.href} className={itemClass} onSelect={() => run(() => router.push(l.href))}>
                            <Icon />
                            {l.label}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                    <Command.Group heading={tTheme("label")} className={groupClass}>
                      {(["system", "light", "dark"] as const).map((m) => {
                        const Icon = m === "system" ? Monitor : m === "light" ? Sun : Moon;
                        return (
                          <Command.Item key={m} value={`theme-${m}`} className={itemClass} onSelect={() => run(() => setTheme(m))}>
                            <Icon />
                            {tTheme(m)}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                    <Command.Group heading={t("language")} className={groupClass}>
                      {routing.locales
                        .filter((l) => l !== locale)
                        .map((l) => (
                          <Command.Item key={l} value={`lang-${l}`} className={itemClass} onSelect={() => run(() => switchTo(l))}>
                            <Languages />
                            {LOCALE_NAMES[l]}
                          </Command.Item>
                        ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>
            </Command>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
