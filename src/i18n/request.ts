import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Office time zone (see OfficeSettings); dates without time are formatted with timeZone "UTC".
    timeZone: "America/Los_Angeles",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
