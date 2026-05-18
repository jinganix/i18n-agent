export function replaceReducer<T>(x: T, y: T): T {
  return y ?? x;
}

const LOCALE_MAP: Record<string, string> = {
  ar: "ar",
  arabic: "ar",
  chinese: "zh-CN",
  "chinese simplified": "zh-CN",
  "chinese traditional": "zh-TW",
  de: "de-DE",
  en: "en-US",
  english: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  french: "fr-FR",
  german: "de-DE",
  it: "it-IT",
  italian: "it-IT",
  ja: "ja-JP",
  japanese: "ja-JP",
  ko: "ko-KR",
  korean: "ko-KR",
  portuguese: "pt-BR",
  pt: "pt-BR",
  ru: "ru-RU",
  russian: "ru-RU",
  "simplified chinese": "zh-CN",
  spanish: "es-ES",
  "traditional chinese": "zh-TW",
  zh: "zh-CN",
};

export function parseLanguagesFromText(text: string): string[] {
  const lowerText = text.toLowerCase();
  const locales: string[] = [];

  const sortedEntries = Object.entries(LOCALE_MAP).sort((a, b) => b[0].length - a[0].length);

  for (const [name, code] of sortedEntries) {
    if (lowerText.includes(name)) {
      const isSubKeyOfAnotherMatch = sortedEntries.some(
        ([otherName]) =>
          otherName !== name &&
          otherName.length > name.length &&
          lowerText.includes(otherName) &&
          otherName.includes(name),
      );

      if (!isSubKeyOfAnotherMatch && !locales.includes(code)) {
        locales.push(code);
      }
    }
  }

  const bcp47Pattern = /\b([a-zA-Z]{2}-[a-zA-Z]{2})\b/g;
  let match;
  while ((match = bcp47Pattern.exec(text)) !== null) {
    const parts = match[1].split("-");
    const normalizedCode = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
    // c8 ignore next 2
    if (!locales.includes(normalizedCode)) {
      locales.push(normalizedCode);
    }
  }

  const localePattern = /\b(zh|en|ja|ko|fr|de|es|it|pt|ru|ar)\b/gi;
  while ((match = localePattern.exec(lowerText)) !== null) {
    const baseCode = match[1].toLowerCase();
    const hasRegion = locales.some((l) => l.toLowerCase().startsWith(baseCode + "-"));
    // c8 ignore next 3
    if (!hasRegion && !locales.some((l) => l.toLowerCase() === baseCode)) {
      const defaultLocale = LOCALE_MAP[baseCode] || baseCode.toUpperCase();
      locales.push(defaultLocale);
    }
  }

  return locales;
}
