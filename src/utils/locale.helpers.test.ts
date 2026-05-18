import { describe, it, expect } from "vitest";
import {
  normalizeLocale,
  localesEqual,
  isValidBCP47Locale,
  validateAndNormalizeLocales,
} from "./locale.helpers.js";

describe("locale.helpers", () => {
  describe("normalizeLocale", () => {
    it("should normalize zh-cn to zh-CN", () => {
      expect(normalizeLocale("zh-cn")).toBe("zh-CN");
    });

    it("should normalize ZH-CN to zh-CN", () => {
      expect(normalizeLocale("ZH-CN")).toBe("zh-CN");
    });

    it("should normalize zh-CN to zh-CN", () => {
      expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    });

    it("should normalize ru-ru to ru-RU", () => {
      expect(normalizeLocale("ru-ru")).toBe("ru-RU");
    });

    it("should normalize RU-RU to ru-RU", () => {
      expect(normalizeLocale("RU-RU")).toBe("ru-RU");
    });

    it("should normalize zh-cn to zh-CN", () => {
      expect(normalizeLocale("zh-cn")).toBe("zh-CN");
    });

    it("should handle single part locale codes", () => {
      expect(normalizeLocale("en")).toBe("en");
    });

    it("should handle already normalized locale codes", () => {
      expect(normalizeLocale("zh-TW")).toBe("zh-TW");
    });

    it("should normalize en-us to en-US", () => {
      expect(normalizeLocale("en-us")).toBe("en-US");
    });

    it("should normalize EN-US to en-US", () => {
      expect(normalizeLocale("EN-US")).toBe("en-US");
    });
  });

  describe("localesEqual", () => {
    it("should compare zh-CN and zh-cn as equal", () => {
      expect(localesEqual("zh-CN", "zh-cn")).toBe(true);
    });

    it("should compare ZH-CN and zh-CN as equal", () => {
      expect(localesEqual("ZH-CN", "zh-CN")).toBe(true);
    });

    it("should compare zh-CN and zh-TW as not equal", () => {
      expect(localesEqual("zh-CN", "zh-TW")).toBe(false);
    });

    it("should compare en-US and en-us as equal", () => {
      expect(localesEqual("en-US", "en-us")).toBe(true);
    });

    it("should compare ru-RU and RU-ru as equal", () => {
      expect(localesEqual("ru-RU", "RU-ru")).toBe(true);
    });

    it("should compare single part locales", () => {
      expect(localesEqual("en", "EN")).toBe(true);
    });
  });

  describe("isValidBCP47Locale", () => {
    it("should validate valid BCP 47 locale codes", () => {
      expect(isValidBCP47Locale("zh-CN")).toBe(true);
      expect(isValidBCP47Locale("en-US")).toBe(true);
      expect(isValidBCP47Locale("zh-CN")).toBe(true);
      expect(isValidBCP47Locale("ru-RU")).toBe(true);
      expect(isValidBCP47Locale("fr-FR")).toBe(true);
    });

    it("should validate simple language codes", () => {
      expect(isValidBCP47Locale("en")).toBe(true);
      expect(isValidBCP47Locale("zh")).toBe(true);
      expect(isValidBCP47Locale("ja")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isValidBCP47Locale("zh-cn")).toBe(true);
      expect(isValidBCP47Locale("ZH-CN")).toBe(true);
      expect(isValidBCP47Locale("En-Us")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidBCP47Locale("chinese")).toBe(false);
      expect(isValidBCP47Locale("zh_china")).toBe(false);
      expect(isValidBCP47Locale("zh-CN-RU")).toBe(false);
      expect(isValidBCP47Locale("")).toBe(false);
      expect(isValidBCP47Locale("z")).toBe(false);
      expect(isValidBCP47Locale("zh-")).toBe(false);
      expect(isValidBCP47Locale("-CN")).toBe(false);
    });
  });

  describe("validateAndNormalizeLocales", () => {
    it("should validate and normalize valid locale array", () => {
      const result = validateAndNormalizeLocales(["zh-CN", "en-US", "zh-TW"]);
      expect(result).toEqual(["zh-CN", "en-US", "zh-TW"]);
    });

    it("should normalize lowercase locale codes", () => {
      const result = validateAndNormalizeLocales(["zh-cn", "en-us"]);
      expect(result).toEqual(["zh-CN", "en-US"]);
    });

    it("should normalize uppercase locale codes", () => {
      const result = validateAndNormalizeLocales(["ZH-CN", "EN-US"]);
      expect(result).toEqual(["zh-CN", "en-US"]);
    });

    it("should handle mixed case locale codes", () => {
      const result = validateAndNormalizeLocales(["zh-cn", "EN-us", "Zh-tw"]);
      expect(result).toEqual(["zh-CN", "en-US", "zh-TW"]);
    });

    it("should throw error for non-array input", () => {
      expect(() => validateAndNormalizeLocales("zh-CN" as unknown as string[])).toThrow(
        "targetLocales must be an array",
      );
    });

    it("should throw error for invalid locale format", () => {
      expect(() => validateAndNormalizeLocales(["chinese"])).toThrow(
        'Invalid locale format: "chinese". Must follow BCP 47 standard',
      );
    });

    it("should throw error for invalid locale type", () => {
      expect(() => validateAndNormalizeLocales([123 as unknown as string])).toThrow(
        "Invalid locale type: number. Expected string.",
      );
    });

    it("should handle empty array", () => {
      const result = validateAndNormalizeLocales([]);
      expect(result).toEqual([]);
    });
  });
});
