import { describe, expect, it, vi } from "vitest";
import { detectChangesNode, DetectChangesAnnotation } from "./detect.changes.js";
import type { FileItem } from "@/utils/file.scanner.js";

vi.mock("@/utils/git.diff.js", () => ({
  detectAllChanges: vi.fn(),
}));

describe("graph/nodes/detect.changes", () => {
  it("should detect changes for single file", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges).mockReturnValue({
      gitChanges: {
        changes: {
          added: ["key1", "key2"],
          deleted: [],
          modified: [],
        },
        filePath: "en.json",
      },
      summary: {
        totalAdded: 2,
        totalDeleted: 0,
        totalMissingInTarget: 0,
      },
    });

    const state: typeof DetectChangesAnnotation.State = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/en.json",
          id: 1,
          relativePath: "en.json",
        },
      ] as FileItem[],
      targetFiles: undefined,
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(result.detectionResults).toBeDefined();
    expect(result.detectionResults!["en.json"]).toBeDefined();
    expect(result.detectionResults!["en.json"].summary.totalAdded).toBe(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Detecting changes"));

    consoleSpy.mockRestore();
  });

  it("should detect changes with target file comparison", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges).mockReturnValue({
      gitChanges: {
        changes: {
          added: ["key1"],
          deleted: ["key2"],
          modified: [],
        },
        filePath: "en.json",
      },
      summary: {
        totalAdded: 1,
        totalDeleted: 1,
        totalMissingInTarget: 3,
      },
      targetMissingKeys: {
        missingKeys: ["key3", "key4", "key5"],
        sourceFile: "en",
        targetFile: "zh",
      },
    });

    const state = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/en.json",
          id: 1,
          relativePath: "en.json",
        },
      ] as FileItem[],
      targetFiles: {
        zh: "/test/zh.json",
      },
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(result.detectionResults!["en.json"].summary.totalMissingInTarget).toBe(3);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("keys missing in target"));

    consoleSpy.mockRestore();
  });

  it("should handle multiple files", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges)
      .mockReturnValueOnce({
        gitChanges: {
          changes: {
            added: ["key1"],
            deleted: [],
            modified: [],
          },
          filePath: "file1.json",
        },
        summary: {
          totalAdded: 1,
          totalDeleted: 0,
          totalMissingInTarget: 0,
        },
      })
      .mockReturnValueOnce({
        gitChanges: {
          changes: {
            added: [],
            deleted: ["key2"],
            modified: [],
          },
          filePath: "file2.json",
        },
        summary: {
          totalAdded: 0,
          totalDeleted: 1,
          totalMissingInTarget: 0,
        },
      });

    const state = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/file1.json",
          id: 1,
          relativePath: "file1.json",
        },
        {
          absolutePath: "/test/file2.json",
          id: 2,
          relativePath: "file2.json",
        },
      ] as FileItem[],
      targetFiles: undefined,
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(Object.keys(result.detectionResults!)).toHaveLength(2);
    expect(result.detectionResults!["file1.json"].summary.totalAdded).toBe(1);
    expect(result.detectionResults!["file2.json"].summary.totalDeleted).toBe(1);

    consoleSpy.mockRestore();
  });

  it("should handle files with no changes", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges).mockReturnValue({
      gitChanges: {
        changes: {
          added: [],
          deleted: [],
          modified: [],
        },
        filePath: "en.json",
      },
      summary: {
        totalAdded: 0,
        totalDeleted: 0,
        totalMissingInTarget: 0,
      },
    });

    const state = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/en.json",
          id: 1,
          relativePath: "en.json",
        },
      ] as FileItem[],
      targetFiles: undefined,
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(result.detectionResults!["en.json"].summary.totalAdded).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No changes detected"));

    consoleSpy.mockRestore();
  });

  it("should handle errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges).mockImplementation(() => {
      throw new Error("Git command failed");
    });

    const state = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/en.json",
          id: 1,
          relativePath: "en.json",
        },
      ] as FileItem[],
      targetFiles: undefined,
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error detecting changes"));
    expect(result.detectionResults).toEqual({});

    consoleSpy.mockRestore();
  });

  it("should handle empty file list", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const state = {
      detectionResults: {},
      files: [] as FileItem[],
      targetFiles: undefined,
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(result.detectionResults).toEqual({});
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Change detection completed"));

    consoleSpy.mockRestore();
  });

  it("should handle targetFiles with empty locale value", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { detectAllChanges } = await import("@/utils/git.diff.js");

    vi.mocked(detectAllChanges).mockReturnValue({
      gitChanges: {
        changes: {
          added: ["key1"],
          deleted: [],
          modified: [],
        },
        filePath: "en.json",
      },
      summary: {
        totalAdded: 1,
        totalDeleted: 0,
        totalMissingInTarget: 0,
      },
    });

    const state = {
      detectionResults: {},
      files: [
        {
          absolutePath: "/test/en.json",
          id: 1,
          relativePath: "en.json",
        },
      ] as FileItem[],
      targetFiles: {
        zh: "",
      },
    };

    const result = await detectChangesNode(state as typeof DetectChangesAnnotation.State);

    expect(result.detectionResults).toBeDefined();
    expect(result.detectionResults!["en.json"]).toBeDefined();
    expect(vi.mocked(detectAllChanges)).toHaveBeenCalledWith("/test/en.json", undefined);

    consoleSpy.mockRestore();
  });
});
