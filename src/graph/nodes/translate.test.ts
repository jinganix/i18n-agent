import { describe, it, expect, vi } from "vitest";
import type { TaskBatch } from "./build.tasks.js";
import { translateNode, TranslateAnnotation } from "./translate.js";

vi.mock("../../utils/api.client.js", () => ({
  getPromptForLocale: vi.fn(() => "Mock prompt template"),
  loadPrompt: vi.fn((_template, replacements) => `Loaded: ${replacements.targetLocale}`),
}));

describe("translate", () => {
  it("should translate task batches", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [
          { prefixedKey: "1.key1", value: "value1" },
          { prefixedKey: "1.key2", value: "value2" },
        ],
        locale: "ja",
        tokenCount: 50,
      },
    ];

    const state = {
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(result.translatedResults).toBeDefined();
    expect(result.translatedResults!["batch_1"]).toBeDefined();
    expect(result.translatedResults!["batch_1"]["1.key1"]).toBe("value1");
    expect(consoleSpy).toHaveBeenCalledWith("Translating batch 1 to ja...");

    consoleSpy.mockRestore();
  });

  it("should handle multiple batches", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ prefixedKey: "1.key1", value: "value1" }],
        locale: "ja",
        tokenCount: 25,
      },
      {
        batchId: 2,
        keys: [{ prefixedKey: "1.key1", value: "value1" }],
        locale: "zh",
        tokenCount: 25,
      },
    ];

    const state = {
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(Object.keys(result.translatedResults!)).toHaveLength(2);
    expect(result.translatedResults!["batch_1"]).toBeDefined();
    expect(result.translatedResults!["batch_2"]).toBeDefined();

    consoleSpy.mockRestore();
  });
});
