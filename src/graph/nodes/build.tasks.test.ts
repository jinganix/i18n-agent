import { describe, it, expect, vi } from "vitest";
import { buildTasksNode, BuildTasksAnnotation } from "./build.tasks.js";
import type { FileItem } from "@/utils/file.scanner.js";

vi.mock("../../utils/token.estimator.js", () => ({
  estimateObjectTokens: vi.fn((obj) => {
    const jsonStr = JSON.stringify(obj);
    return Math.ceil(jsonStr.length / 4);
  }),
}));

describe("build.tasks", () => {
  it("should build task batches based on token size", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja", "zh"],
        tokenSize: 100,
      },
      files: [{ absolutePath: "/test/en.json", id: 1, relativePath: "en.json" }] as FileItem[],
      flattenedData: {
        "en.json": {
          "1.key1": "value1",
          "1.key2": "value2",
        },
      },
      lastCompletedBatchId: 0,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    expect(result.tasks).toBeDefined();
    expect(result.tasks!.length).toBeGreaterThan(0);
    expect(result.tasks![0].locale).toBe("ja");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Built"));

    consoleSpy.mockRestore();
  });

  it("should not mix different locales in same batch", async () => {
    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja", "zh"],
        tokenSize: 1000,
      },
      files: [{ absolutePath: "/test/en.json", id: 1, relativePath: "en.json" }] as FileItem[],
      flattenedData: {
        "en.json": {
          "1.key1": "value1",
        },
      },
      lastCompletedBatchId: 0,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    const jaBatches = result.tasks!.filter((t) => t.locale === "ja");
    const zhBatches = result.tasks!.filter((t) => t.locale === "zh");

    expect(jaBatches.length).toBeGreaterThan(0);
    expect(zhBatches.length).toBeGreaterThan(0);

    const jaBatchIds = new Set(jaBatches.map((b) => b.batchId));
    const zhBatchIds = new Set(zhBatches.map((b) => b.batchId));

    jaBatchIds.forEach((id) => {
      expect(zhBatchIds.has(id)).toBe(false);
    });
  });

  it("should resume from last completed batch", async () => {
    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
        tokenSize: 1000,
      },
      files: [{ absolutePath: "/test/en.json", id: 1, relativePath: "en.json" }] as FileItem[],
      flattenedData: {
        "en.json": {
          "1.key1": "value1",
        },
      },
      lastCompletedBatchId: 5,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    expect(result.tasks![0].batchId).toBe(6);
  });

  it("should split into multiple batches when exceeding token size", async () => {
    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
        tokenSize: 10,
      },
      files: [{ absolutePath: "/test/en.json", id: 1, relativePath: "en.json" }] as FileItem[],
      flattenedData: {
        "en.json": {
          "1.key1": "value1",
          "1.key2": "value2",
          "1.key3": "value3",
        },
      },
      lastCompletedBatchId: 0,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    expect(result.tasks!.length).toBeGreaterThan(1);
  });

  it("should use default tokenSize when not configured", async () => {
    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
      },
      files: [{ absolutePath: "/test/en.json", id: 1, relativePath: "en.json" }] as FileItem[],
      flattenedData: {
        "en.json": {
          "1.key1": "value1",
        },
      },
      lastCompletedBatchId: 0,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    expect(result.tasks).toBeDefined();
    expect(result.tasks!.length).toBe(1);
  });

  it("should handle empty flattened data", async () => {
    const state = {
      config: {
        localesDir: "./tests/fixture/locales",
        sourceLocale: "en",
        targetLocales: ["ja"],
        tokenSize: 1000,
      },
      files: [] as FileItem[],
      flattenedData: {},
      lastCompletedBatchId: 0,
      tasks: [],
    };

    const result = await buildTasksNode(state as typeof BuildTasksAnnotation.State);

    expect(result.tasks).toBeDefined();
    expect(result.tasks!.length).toBe(0);
  });
});
