import { describe, it, expect, vi } from "vitest";
import type { TaskBatch } from "./build.tasks.js";
import { syncFilesNode, SyncFilesAnnotation } from "./sync.files.js";

vi.mock("../../utils/file.syncer.js", () => ({
  syncTranslationToFile: vi.fn((path, data) => ({
    filePath: path,
    keyCount: Object.keys(data).length,
  })),
}));

describe("sync.files", () => {
  it("should sync translated files to target locales", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.user.name", value: "ユーザー名" }],
        locale: "ja",
        tokenCount: 25,
      },
    ];

    const state = {
      config: {
        localesDir: "./tests/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.user.name": "ユーザー名",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    expect(result.syncedFiles).toBeDefined();
    expect(result.syncedFiles!.length).toBe(1);
    expect(result.syncedFiles![0].locale).toBe("ja");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Synced"));

    consoleSpy.mockRestore();
  });

  it("should handle multiple locales", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "値1" }],
        locale: "ja",
        tokenCount: 20,
      },
      {
        batchId: 2,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "值1" }],
        locale: "zh",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: "./tests/locales",
        sourceLocale: "en",
        targetLocales: ["ja", "zh"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "値1",
        },
        batch_2: {
          "1.key1": "值1",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    expect(result.syncedFiles!.length).toBe(2);

    consoleSpy.mockRestore();
  });

  it("should rename file when filename matches source locale", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "値1" }],
        locale: "ja",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: "./tests/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "値1",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    expect(result.syncedFiles![0].filePath).toContain("ja.json");

    consoleSpy.mockRestore();
  });

  it("should keep original filename when not matching source locale", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "nested.json", prefixedKey: "1.key1", value: "値1" }],
        locale: "ja",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: "./tests/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "値1",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    expect(result.syncedFiles![0].filePath).toContain("nested.json");

    consoleSpy.mockRestore();
  });
});
