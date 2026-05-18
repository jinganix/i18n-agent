import { describe, it, expect } from "vitest";
import { replaceReducer, parseLanguagesFromText } from "./langgraph.helpers.js";

describe("replaceReducer", () => {
  it("should return new value when provided", () => {
    expect(replaceReducer("old", "new")).toBe("new");
  });

  it("should return old value when new value is null", () => {
    expect(replaceReducer("old", null as unknown as string)).toBe("old");
  });

  it("should return old value when new value is undefined", () => {
    expect(replaceReducer("old", undefined as unknown as string)).toBe("old");
  });

  it("should handle numbers", () => {
    expect(replaceReducer(1, 2)).toBe(2);
    expect(replaceReducer(1, null as unknown as number)).toBe(1);
  });
});

describe("parseLanguagesFromText", () => {
  it("should parse language names from text", () => {
    const result = parseLanguagesFromText("Translate to Chinese and Japanese");
    expect(result).toContain("zh-CN");
    expect(result).toContain("ja-JP");
  });

  it("should parse BCP 47 locale codes", () => {
    const result = parseLanguagesFromText("Translate to zh-CN and en-US");
    expect(result).toContain("zh-CN");
    expect(result).toContain("en-US");
  });

  it("should parse short locale codes", () => {
    const result = parseLanguagesFromText("Translate to zh and en");
    expect(result).toContain("zh-CN");
    expect(result).toContain("en-US");
  });

  it("should not duplicate locales", () => {
    const result = parseLanguagesFromText("Translate to Chinese and zh-CN");
    expect(result.filter((l) => l === "zh-CN")).toHaveLength(1);
  });

  it("should prefer longer matches over shorter ones", () => {
    const result = parseLanguagesFromText("Translate to Chinese Simplified");
    expect(result).toContain("zh-CN");
    expect(result).not.toContain("zh-TW");
  });

  it("should handle multiple languages", () => {
    const result = parseLanguagesFromText(
      "Translate to English, French, German, Spanish, Italian, Portuguese, Russian, Arabic, Korean",
    );
    expect(result).toContain("en-US");
    expect(result).toContain("fr-FR");
    expect(result).toContain("de-DE");
    expect(result).toContain("es-ES");
    expect(result).toContain("it-IT");
    expect(result).toContain("pt-BR");
    expect(result).toContain("ru-RU");
    expect(result).toContain("ar");
    expect(result).toContain("ko-KR");
  });

  it("should handle case insensitivity", () => {
    const result = parseLanguagesFromText("Translate to CHINESE and JAPANESE");
    expect(result).toContain("zh-CN");
    expect(result).toContain("ja-JP");
  });

  it("should return empty array when no languages found", () => {
    const result = parseLanguagesFromText("Hello world xyz");
    expect(result).toHaveLength(0);
  });

  it("should handle mixed formats", () => {
    const result = parseLanguagesFromText("Translate to Chinese, ja-JP, and Korean");
    expect(result).toContain("zh-CN");
    expect(result).toContain("ja-JP");
    expect(result).toContain("ko-KR");
  });

  it("should handle Traditional Chinese", () => {
    const result = parseLanguagesFromText("Translate to Traditional Chinese");
    expect(result).toContain("zh-TW");
  });

  it("should handle Simplified Chinese", () => {
    const result = parseLanguagesFromText("Translate to Simplified Chinese");
    expect(result).toContain("zh-CN");
  });

  it("should add BCP 47 code when not already in list", () => {
    const result = parseLanguagesFromText("Translate to de-DE");
    expect(result).toContain("de-DE");
  });

  it("should not duplicate BCP 47 codes", () => {
    const result = parseLanguagesFromText("Translate to de-DE and German");
    expect(result.filter((l) => l === "de-DE")).toHaveLength(1);
  });

  it("should add default locale for short code when no region exists", () => {
    const result = parseLanguagesFromText("Translate to fr");
    expect(result).toContain("fr-FR");
  });

  it("should not add duplicate BCP 47 codes", () => {
    const result = parseLanguagesFromText("Translate to de-DE and de-DE again");
    expect(result.filter((l) => l === "de-DE")).toHaveLength(1);
  });

  it("should not add short code when region code already exists", () => {
    const result = parseLanguagesFromText("Translate to zh-CN and zh");
    expect(result.filter((l) => l.startsWith("zh"))).toHaveLength(1);
    expect(result).toContain("zh-CN");
  });

  it("should not add duplicate BCP 47 codes from text", () => {
    const result = parseLanguagesFromText("Translate to de-DE and also de-DE");
    expect(result.filter((l) => l === "de-DE")).toHaveLength(1);
  });

  it("should not add short code when already added", () => {
    const result = parseLanguagesFromText("Translate to fr and then fr again");
    expect(result.filter((l) => l === "fr-FR")).toHaveLength(1);
  });

  it("should handle BCP 47 code appearing after language name", () => {
    const result = parseLanguagesFromText("Translate to German and de-DE");
    expect(result.filter((l) => l === "de-DE")).toHaveLength(1);
  });

  it("should handle short code appearing after language name", () => {
    const result = parseLanguagesFromText("Translate to french and fr");
    expect(result.filter((l) => l === "fr-FR")).toHaveLength(1);
  });

  it("should add BCP 47 code when it appears first", () => {
    const result = parseLanguagesFromText("Translate to de-DE only");
    expect(result).toContain("de-DE");
    expect(result).toHaveLength(1);
  });

  it("should add short code when it appears first", () => {
    const result = parseLanguagesFromText("Translate to fr only");
    expect(result).toContain("fr-FR");
    expect(result).toHaveLength(1);
  });
});
