import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { TaskBatch } from "./build.tasks.js";
import { syncFilesNode, SyncFilesAnnotation } from "./sync.files.js";

vi.mock("../../utils/file.syncer.js", () => ({
  mergeWithExistingData: vi.fn((_path, data) => data),
  syncTranslationToFile: vi.fn((_path, data) => ({
    filePath: _path,
    keyCount: Object.keys(data).length,
  })),
}));

describe("sync.files", () => {
  const tempDir = join(process.cwd(), ".tmp/temp-sync-test");

  beforeAll(() => {
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { force: true, recursive: true });
  });

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
        localesDir: tempDir,
        mode: "full",
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
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "値1" }],
        locale: "zh",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: tempDir,
        mode: "full",
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
          "1.key1": "値1",
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
        localesDir: tempDir,
        mode: "full",
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
        localesDir: tempDir,
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

  it("should handle missing batch data gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "Value" }],
        locale: "fr",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: tempDir,
        mode: "full",
        sourceLocale: "en",
        targetLocales: ["fr"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        // Missing batch_1 data
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    // Should complete without error even with missing data
    expect(result.syncedFiles).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("should handle file without extension", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "messages", prefixedKey: "1.key1", value: "値1" }],
        locale: "zh",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: tempDir,
        sourceLocale: "en",
        targetLocales: ["zh"],
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

    expect(result.syncedFiles).toBeDefined();

    consoleSpy.mockRestore();
  });

  it("should handle multiple files in same locale", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [
          { fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "値1" },
          { fileId: 2, filePath: "nested.json", prefixedKey: "2.key2", value: "値2" },
        ],
        locale: "zh",
        tokenCount: 40,
      },
    ];

    const state = {
      config: {
        localesDir: tempDir,
        mode: "full",
        sourceLocale: "en",
        targetLocales: ["zh"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "値1",
          "2.key2": "値2",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    expect(result.syncedFiles!.length).toBe(2);

    consoleSpy.mockRestore();
  });

  it("should handle multiple batches for same locale", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    // Multiple batches for the same locale to test the if (!batchesByLocale[task.locale]) branch
    const tasks: TaskBatch[] = [
      {
        batchId: 1,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key1", value: "Value1" }],
        locale: "de",
        tokenCount: 20,
      },
      {
        batchId: 2,
        keys: [{ fileId: 1, filePath: "en.json", prefixedKey: "1.key2", value: "Value2" }],
        locale: "de",
        tokenCount: 20,
      },
    ];

    const state = {
      config: {
        localesDir: tempDir,
        mode: "full",
        sourceLocale: "en",
        targetLocales: ["de"],
      },
      syncedFiles: [],
      tasks,
      translatedResults: {
        batch_1: {
          "1.key1": "Wert1",
        },
        batch_2: {
          "1.key2": "Wert2",
        },
      },
    };

    const result = await syncFilesNode(state as typeof SyncFilesAnnotation.State);

    // Both batches should be merged into one file
    expect(result.syncedFiles!.length).toBe(1);
    expect(result.syncedFiles![0].keyCount).toBe(2);

    consoleSpy.mockRestore();
  });
});
