import { describe, it, expect, vi } from "vitest";
import type { TaskBatch } from "./build.tasks.js";
import { validateResultsNode, ValidateResultsAnnotation } from "./validate.results.js";

describe("validate.results", () => {
  it("should validate successful translation", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" },
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key2", value: "value2" },
        ],
        locale: "zh-CN",
        tokenCount: 50,
      },
    ];

    const state = {
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "翻译1",
          "1.key2": "翻译2",
        },
      },
      validationResults: [],
    };

    const result = await validateResultsNode(state as typeof ValidateResultsAnnotation.State);

    expect(result.validationResults).toBeDefined();
    expect(result.validationResults!.length).toBe(1);
    expect(result.validationResults![0].isValid).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Validation passed"));

    consoleSpy.mockRestore();
  });

  it("should detect missing keys", async () => {
    const consoleSpy = vi.spyOn(console, "error");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" },
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key2", value: "value2" },
        ],
        locale: "zh-CN",
        tokenCount: 50,
      },
    ];

    const state = {
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "翻译1",
        },
      },
      validationResults: [],
    };

    const result = await validateResultsNode(state as typeof ValidateResultsAnnotation.State);

    expect(result.validationResults![0].isValid).toBe(false);
    expect(result.validationResults![0].errors.some((e) => e.includes("Missing"))).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Validation failed"));

    consoleSpy.mockRestore();
  });

  it("should handle missing translation data", async () => {
    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 50,
      },
    ];

    const state = {
      tasks,
      translatedResults: {},
      validationResults: [],
    };

    const result = await validateResultsNode(state as typeof ValidateResultsAnnotation.State);

    expect(result.validationResults![0].isValid).toBe(false);
    expect(result.validationResults![0].errors[0]).toContain("No translation data");
  });
});
