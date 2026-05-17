import { describe, it, expect, vi } from "vitest";
import { flattenKeysNode, FlattenKeysAnnotation } from "./flatten.keys.js";
import type { FileItem } from "../../utils/file.scanner.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

describe("flatten.keys", () => {
  it("should flatten keys with file ID prefix", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { readFileSync } = await import("fs");

    vi.mocked(readFileSync).mockReturnValue('{"user": {"name": "John", "age": 30}}');

    const files: FileItem[] = [
      {
        absolutePath: "/test/en.json",
        id: 1,
        relativePath: "en.json",
      },
    ];

    const state = {
      files,
      flattenedData: {},
    };

    const result = await flattenKeysNode(state as typeof FlattenKeysAnnotation.State);

    expect(result.flattenedData).toBeDefined();
    expect(result.flattenedData!["en.json"]).toEqual({
      "1.user.age": 30,
      "1.user.name": "John",
    });
    expect(consoleSpy).toHaveBeenCalledWith("Flattened file [1]: en.json");

    consoleSpy.mockRestore();
  });

  it("should handle multiple files", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { readFileSync } = await import("fs");

    vi.mocked(readFileSync)
      .mockReturnValueOnce('{"key1": "value1"}')
      .mockReturnValueOnce('{"key2": "value2"}');

    const files: FileItem[] = [
      {
        absolutePath: "/test/en.json",
        id: 1,
        relativePath: "en.json",
      },
      {
        absolutePath: "/test/zh.json",
        id: 2,
        relativePath: "zh.json",
      },
    ];

    const state = {
      files,
      flattenedData: {},
    };

    const result = await flattenKeysNode(state as typeof FlattenKeysAnnotation.State);

    expect(result.flattenedData).toBeDefined();
    expect(Object.keys(result.flattenedData!)).toHaveLength(2);
    expect(result.flattenedData!["en.json"]).toEqual({
      "1.key1": "value1",
    });
    expect(result.flattenedData!["zh.json"]).toEqual({
      "2.key2": "value2",
    });

    consoleSpy.mockRestore();
  });

  it("should throw error when file read fails", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const { readFileSync } = await import("fs");

    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    const files: FileItem[] = [
      {
        absolutePath: "/test/nonexistent.json",
        id: 1,
        relativePath: "nonexistent.json",
      },
    ];

    const state = {
      files,
      flattenedData: {},
    };

    await expect(flattenKeysNode(state as typeof FlattenKeysAnnotation.State)).rejects.toThrow(
      "File not found",
    );
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
