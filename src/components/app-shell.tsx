"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { logout } from "@/app/actions";
import { CommandPalette } from "@/components/command-palette";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NAV_ICONS, NavLinks, useActiveHref, type NavItem } from "@/components/nav-links";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DesignSwitcher } from "@/components/ui/design-switcher";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Tooltip } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { spring } from "@/lib/motion";
import { rememberTrigger } from "@/lib/trigger-origin";
import { cn } from "@/lib/utils";

type ShellUser = { id: string; name: string; role: string };

const MOBILE_TABS: NavItem["icon"][] = ["dashboard", "requests", "officePlan", "map", "employees"];
const STORAGE_KEY = "mf.sidebar";

function useMedia(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

export function BrandMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary bg-[linear-gradient(160deg,rgb(255_255_255/.25),transparent_60%)] text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/.3),0_4px_10px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 17V8l5 6 3-4 3 4 5-6v9" />
      </svg>
    </span>
  );
}

/**
 * Glass sidebar on desktop (collapses into a rail and pushes the content, never covers it),
 * a rail on tablets, a top bar + thumb-reachable tab bar on phones. Ctrl+K / "/" open the palette.
 */
export function AppShell({
  links,
  user,
  simulationLabel,
  day,
  children,
}: {
  links: NavItem[];
  user: ShellUser;
  simulationLabel?: string;
  /** The day's main action (go out / come back): same place on every page. */
  day?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("shell");
  const tNav = useTranslations("nav");
  const isWide = useMedia("(min-width: 1024px)", true);
  const [collapsedPref, setCollapsedPref] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrolled = useScrolled();
  const rail = !isWide || collapsedPref;
  const hasNav = links.length > 0;

  useEffect(() => {
    try {
      setCollapsedPref(localStorage.getItem(STORAGE_KEY) === "rail");
    } catch {}
  }, []);

  const toggleRail = () => {
    setCollapsedPref((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "full" : "rail");
      } catch {}
      return !c;
    });
  };

  useEffect(() => {
    if (!hasNav) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        // Opened from the keyboard, it still grows out of the visible search button.
        const trigger = [...document.querySelectorAll("[data-palette-trigger]")].find((el) => (el as HTMLElement).offsetParent);
        rememberTrigger(trigger ?? null);
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNav]);

  const tabs = MOBILE_TABS.map((icon) => links.find((l) => l.icon === icon)).filter((l): l is NavItem => !!l);
  const activeTab = useActiveHref(tabs);

  return (
    <div
      className="min-h-dvh [--sb-w:248px] data-[rail=true]:[--sb-w:76px]"
      data-rail={rail}
    >
      {/* ---------- Sidebar (≥ md) ---------- */}
      <aside
        className="glass fixed top-3 bottom-3 left-3 z-40 flex w-(--sb-w) flex-col overflow-hidden rounded-[1.375rem] p-3 [transition:width_.55s_var(--ease-spring-soft)] max-md:hidden"
        aria-label={t("sidebar")}
      >
        <div className="flex h-11 items-center gap-2.5 px-0.5">
          <BrandMark />
          <span data-plate className={cn("truncate text-[0.9375rem] font-semibold tracking-tight transition-opacity duration-200", rail && "opacity-0")}>
            MarginFlow
          </span>
        </div>

        {hasNav && (
          <>
            <button
              type="button"
              data-palette-trigger
              onClick={() => setPaletteOpen(true)}
              aria-label={t("search")}
              className="inset-well mt-4 mb-3 flex h-10 w-full shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="size-4 shrink-0" />
              <span className={cn("truncate transition-opacity duration-200", rail && "opacity-0")}>{t("search")}</span>
              <kbd className={cn("ml-auto rounded-md bg-card/70 px-1.5 font-mono text-[11px] transition-opacity", rail && "opacity-0")}>Ctrl K</kbd>
            </button>
            <div className="-mx-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1">
              <NavLinks links={links} collapsed={rail} />
            </div>
          </>
        )}
        {!hasNav && <div className="flex-1" />}

        <div className="mt-3 flex flex-col gap-2.5 border-t border-border/60 pt-3">
          {simulationLabel && (
            <Badge variant="info" className={cn("mx-auto w-full", rail && "w-auto px-1.5")} data-testid="simulation-badge" title={simulationLabel}>
              <span className="size-1.5 shrink-0 animate-breathe rounded-full bg-current" />
              {!rail && simulationLabel}
            </Badge>
          )}
          {day && !rail && <div data-testid="sidebar-day">{day}</div>}
          {!rail && (
            <div className="flex flex-col gap-2">
              <DesignSwitcher className="w-full" />
              <ThemeSwitcher compact />
              <LocaleSwitcher className="w-full" />
            </div>
          )}
          <div className="flex items-center gap-2.5 px-0.5">
            <Avatar id={user.id} name={user.name} size="md" />
            <div className={cn("min-w-0 flex-1 transition-opacity duration-200", rail && "hidden")}>
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground" data-testid="current-role">
                {user.role}
              </div>
            </div>
            {!rail && (
              <form action={logout}>
                <Tooltip content={tNav("logout")}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={tNav("logout")}>
                    <LogOut />
                  </Button>
                </Tooltip>
              </form>
            )}
          </div>
          {isWide && (
            <Button variant="ghost" size="sm" onClick={toggleRail} className="justify-start gap-2.5 px-2.5 text-muted-foreground" aria-label={rail ? t("expand") : t("collapse")}>
              {rail ? <PanelLeftOpen /> : <PanelLeftClose />}
              <span className={cn("transition-opacity duration-200", rail && "opacity-0")}>{t("collapse")}</span>
            </Button>
          )}
        </div>
      </aside>

      {/* ---------- Phone top bar ---------- */}
      <header
        className={cn(
          "glass liquid-bar sticky top-2 z-40 mx-3 mt-2 flex h-14 items-center gap-2 rounded-2xl px-2.5 transition-[background-color] duration-300 md:hidden",
          scrolled && "glass-strong",
        )}
      >
        <BrandMark />
        <span data-plate className="truncate font-semibold tracking-tight">MarginFlow</span>
        {simulationLabel && (
          <span className="size-2 animate-breathe rounded-full bg-sig-info text-sig-info" title={simulationLabel} />
        )}
        <div className="ml-auto flex items-center gap-1">
          {hasNav && (
            <Button variant="ghost" size="icon" data-palette-trigger aria-label={t("search")} onClick={() => setPaletteOpen(true)}>
              <Search />
            </Button>
          )}
          <Dialog>
            <DialogTrigger render={<button type="button" aria-label={t("account")} className="rounded-full p-1.5" />}>
              <Avatar id={user.id} name={user.name} size="sm" />
            </DialogTrigger>
            <DialogContent title={user.name} description={user.role}>
              <div className="mt-5 flex flex-col gap-3">
                <DesignSwitcher className="w-full" />
                <ThemeSwitcher />
                <LocaleSwitcher className="w-full" />
                <form action={logout}>
                  <Button type="submit" variant="outline" className="w-full">
                    <LogOut />
                    {tNav("logout")}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ---------- Content: pushed by the sidebar, never covered ---------- */}
      <main className="w-full px-4 pt-5 pb-44 [transition:padding_.55s_var(--ease-spring-soft)] md:pr-6 md:pb-10 md:pl-[calc(var(--sb-w)+1.75rem)] md:pt-6">
        {children}
      </main>

      {/* ---------- Phone: the day action floats right above the tab bar, under the thumb ---------- */}
      {day && (
        <div className="fixed right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 w-44 md:hidden">{day}</div>
      )}

      {/* ---------- Phone tab bar (thumb zone) ---------- */}
      {tabs.length > 0 && (
        <nav
          className="glass glass-strong liquid-bar fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch rounded-2xl p-1.5 md:hidden"
          aria-label={t("tabs")}
        >
          {tabs.map((tab) => {
            const Icon = NAV_ICONS[tab.icon];
            const active = tab.href === activeTab;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span layoutId="tab-pill" transition={spring.smooth} className="lens absolute inset-0 rounded-xl bg-primary/10" />
                )}
                <Icon className="relative size-5" />
                <span className="relative max-w-full truncate px-1">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {hasNav && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} links={links} />}
    </div>
  );
}
