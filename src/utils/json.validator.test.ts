import { describe, it, expect } from "vitest";
import { validateJsonStructure, validateTranslationBatch } from "./json.validator.js";

describe("json.validator", () => {
  it("should validate matching keys", () => {
    const inputKeys = ["key1", "key2", "key3"];
    const outputData = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect missing keys", () => {
    const inputKeys = ["key1", "key2", "key3"];
    const outputData = {
      key1: "value1",
      key2: "value2",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Missing keys: key3");
  });

  it("should detect extra keys", () => {
    const inputKeys = ["key1", "key2"];
    const outputData = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Extra keys: key3");
  });

  it("should detect both missing and extra keys", () => {
    const inputKeys = ["key1", "key2"];
    const outputData = {
      key2: "value2",
      key3: "value3",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Extra"))).toBe(true);
  });

  it("should validate translation batch", () => {
    const inputKeys = [
      { prefixedKey: "1.key1", value: "value1" },
      { prefixedKey: "1.key2", value: "value2" },
    ];
    const translatedData = {
      "1.key1": "翻译1",
      "1.key2": "翻译2",
    };

    const result = validateTranslationBatch(1, "ja", inputKeys, translatedData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should report validation errors for batch", () => {
    const inputKeys = [
      { prefixedKey: "1.key1", value: "value1" },
      { prefixedKey: "1.key2", value: "value2" },
    ];
    const translatedData = {
      "1.key1": "翻译1",
    };

    const result = validateTranslationBatch(1, "ja", inputKeys, translatedData);

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Batch 1 (ja)");
  });
});
