import { describe, it, expect, vi } from "vitest";
import type { SyncConfig } from "./load.config.js";
import { scanFilesNode, ScanFilesAnnotation } from "./scan.files.js";

describe("scan.files", () => {
  const mockConfig: SyncConfig = {
    api: {
      apiKey: "sk-test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      timeout: 30000,
    },
    localesDir: "./tests/fixture/locales",
    sourceLocale: "en",
    targetLocales: ["ja", "zh"],
    tokenSize: 3000,
  };

  it("should scan all files in source locale directory", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { readdirSync, statSync } = await import("fs");

    vi.mock("fs", () => ({
      readdirSync: vi.fn(),
      statSync: vi.fn(),
    }));

    let callCount = 0;
    vi.mocked(statSync).mockImplementation(() => {
      callCount++;
      // First call is for the directory itself
      if (callCount === 1) {
        return { isDirectory: () => true, isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }
      // Subsequent calls are for files
      return { isDirectory: () => false, isFile: () => true } as unknown as ReturnType<
        typeof statSync
      >;
    });

    vi.mocked(readdirSync).mockReturnValueOnce(["en.json", "nested.json"] as unknown as ReturnType<
      typeof readdirSync
    >);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: undefined,
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(2);
    expect(result.files![0].id).toBe(1);
    expect(result.files![1].id).toBe(2);
    expect(consoleSpy).toHaveBeenCalledWith("Found 2 file(s) to process:");

    consoleSpy.mockRestore();
  });

  it("should scan a single file", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { statSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en/en.json",
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(1);
    expect(result.files![0].id).toBe(1);
    expect(result.files![0].relativePath).toBe("en.json");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should throw error when config is not loaded", async () => {
    const state = {
      config: null,
      files: [],
      sourcePath: undefined,
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Configuration not loaded",
    );
  });

  it("should throw error when source path is outside source locale directory", async () => {
    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "/tmp/outside.json",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Source path must be within the source locale directory",
    );
  });

  it("should throw error when file is not JSON", async () => {
    const { statSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en/file.txt",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Source file must be a JSON file",
    );
  });

  it("should throw error when path is invalid", async () => {
    const { statSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => false,
    } as unknown as ReturnType<typeof statSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en/en.json",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Invalid path",
    );
  });
});
