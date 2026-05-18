export function normalizeLocale(locale: string): string {
  const parts = locale.split("-");
  if (parts.length === 2) {
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }
  return locale.toLowerCase();
}

export function localesEqual(locale1: string, locale2: string): boolean {
  return normalizeLocale(locale1) === normalizeLocale(locale2);
}

export function isValidBCP47Locale(locale: string): boolean {
  const bcp47Pattern = /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/;
  return bcp47Pattern.test(locale);
}

export function validateAndNormalizeLocales(locales: string[]): string[] {
  if (!Array.isArray(locales)) {
    throw new Error("targetLocales must be an array");
  }

  return locales.map((locale) => {
    if (typeof locale !== "string") {
      throw new Error(`Invalid locale type: ${typeof locale}. Expected string.`);
    }

    if (!isValidBCP47Locale(locale)) {
      throw new Error(
        `Invalid locale format: "${locale}". Must follow BCP 47 standard (e.g., zh-CN, en-US, zh-TW).`,
      );
    }

    return normalizeLocale(locale);
  });
}
