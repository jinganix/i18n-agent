import { describe, it, expect, vi } from "vitest";
import type { TaskBatch } from "./build.tasks.js";
import { translateNode, TranslateAnnotation } from "./translate.js";

vi.mock("../../utils/api.client.js", () => ({
  callTranslationApi: vi.fn(() =>
    Promise.resolve('{"1.key1": "translated1", "1.key2": "translated2"}'),
  ),
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
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" },
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key2", value: "value2" },
        ],
        locale: "zh-CN",
        tokenCount: 50,
      },
    ];

    const state = {
      apiConfig: {
        apiKey: "test-key",
        baseUrl: "https://api.test.com/v1",
        model: "gpt-4o-mini",
      },
      dryRun: false,
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(result.translatedResults).toBeDefined();
    expect(result.translatedResults!["batch_1"]).toBeDefined();
    expect(result.translatedResults!["batch_1"]["1.key1"]).toBe("translated1");
    expect(consoleSpy).toHaveBeenCalledWith("Translating batch 1 to zh-CN...");

    consoleSpy.mockRestore();
  });

  it("should handle AI response with markdown code blocks", async () => {
    const { callTranslationApi } = await import("../../utils/api.client.js");
    vi.mocked(callTranslationApi).mockResolvedValueOnce('```json\n{"1.key1": "translated1"}\n```');

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 25,
      },
    ];

    const state = {
      apiConfig: {
        apiKey: "test-key",
        baseUrl: "https://api.test.com/v1",
        model: "gpt-4o-mini",
      },
      dryRun: false,
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(result.translatedResults!["batch_1"]["1.key1"]).toBe("translated1");
  });

  it("should handle AI response with json prefix", async () => {
    const { callTranslationApi } = await import("../../utils/api.client.js");
    vi.mocked(callTranslationApi).mockResolvedValueOnce('json {"1.key1": "translated1"}');

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 25,
      },
    ];

    const state = {
      apiConfig: {
        apiKey: "test-key",
        baseUrl: "https://api.test.com/v1",
        model: "gpt-4o-mini",
      },
      dryRun: false,
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(result.translatedResults!["batch_1"]["1.key1"]).toBe("translated1");
  });

  it("should handle multiple batches", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 25,
      },
      {
        batchId: 2,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 25,
      },
    ];

    const state = {
      apiConfig: {
        apiKey: "test-key",
        baseUrl: "https://api.test.com/v1",
        model: "gpt-4o-mini",
      },
      dryRun: false,
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(Object.keys(result.translatedResults!)).toHaveLength(2);
    expect(result.translatedResults!["batch_1"]).toBeDefined();
    expect(result.translatedResults!["batch_2"]).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("should skip translation in dry run mode", async () => {
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
      dryRun: true,
      tasks,
      translatedResults: {},
    };

    const result = await translateNode(state as typeof TranslateAnnotation.State);

    expect(result.translatedResults).toBeDefined();
    expect(result.translatedResults!["batch_1"]).toBeDefined();
    expect(result.translatedResults!["batch_1"]["1.key1"]).toBe("value1");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Dry Run] Skipping translation for batch 1 to zh-CN...",
    );

    consoleSpy.mockRestore();
  });

  it("should throw error when apiConfig is missing in non-dry-run mode", async () => {
    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "value1" }],
        locale: "zh-CN",
        tokenCount: 25,
      },
    ];

    const state = {
      apiConfig: undefined,
      dryRun: false,
      tasks,
      translatedResults: {},
    };

    await expect(translateNode(state as typeof TranslateAnnotation.State)).rejects.toThrow(
      "API configuration is required for translation",
    );
  });
});
