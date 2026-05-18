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

  it("should handle empty input and output", () => {
    const inputKeys: string[] = [];
    const outputData: Record<string, unknown> = {};

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should handle invalid JSON with circular reference", () => {
    const inputKeys = ["key1"];
    const outputData: Record<string, unknown> = {
      invalid: BigInt(123),
      key1: "value1",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Output is not valid JSON");
  });

  it("should handle multiple missing keys", () => {
    const inputKeys = ["key1", "key2", "key3", "key4"];
    const outputData = {
      key1: "value1",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Missing keys: key2, key3, key4");
  });

  it("should handle multiple extra keys", () => {
    const inputKeys = ["key1"];
    const outputData = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    const result = validateJsonStructure(inputKeys, outputData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Extra keys: key2, key3");
  });

  it("should validate batch with different locale", () => {
    const inputKeys = [{ prefixedKey: "1.welcome", value: "Welcome" }];
    const translatedData = {
      "1.welcome": "欢迎",
    };

    const result = validateTranslationBatch(2, "zh", inputKeys, translatedData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should report batch validation error with correct format", () => {
    const inputKeys = [{ prefixedKey: "1.key1", value: "value1" }];
    const translatedData = {
      "1.key2": "wrong key",
    };

    const result = validateTranslationBatch(5, "fr", inputKeys, translatedData);

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toBe("Batch 5 (fr): Validation failed");
    expect(result.errors[1]).toContain("Missing keys");
    expect(result.errors[2]).toContain("Extra keys");
  });
});
