import type { Metadata, Viewport } from "next";
import { Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { DESIGN_SCRIPT } from "@/lib/design";
import "../globals.css";
import "../design-tactile.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin", "cyrillic"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
// Only the skeuomorphic design uses Plex, so it is not preloaded for everyone.
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "cyrillic"], weight: ["400", "500"], preload: false });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("name"), description: t("tagline") };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efebe4" },
    { media: "(prefers-color-scheme: dark)", color: "#121414" },
  ],
  viewportFit: "cover",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // next-themes sets the theme class before paint, so the server markup differs on purpose.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DESIGN_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}>
        <div className="app-backdrop" aria-hidden />
        {/* Liquid-glass lens: low-frequency noise bends what is behind small glass controls (Chromium only). */}
        <svg width="0" height="0" aria-hidden className="absolute">
          <filter id="liquid-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="4" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="1.5" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="14" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
