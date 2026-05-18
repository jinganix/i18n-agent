import { resolve } from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SyncConfig } from "./load.config.js";
import { scanFilesNode, ScanFilesAnnotation } from "./scan.files.js";

vi.mock("fs", () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

describe("scan.files", () => {
  const mockConfig: SyncConfig = {
    api: {
      apiKey: "sk-test-key",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      timeout: 30000,
    },
    localesDir: "./tests/fixture/locales",
    sourceLocale: "en-US",
    targetLocales: ["zh-CN", "zh-TW"],
    tokenSize: 3000,
  };

  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log");
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it("should scan all files in source locale directory", async () => {
    const { readdirSync, statSync } = await import("fs");

    let callCount = 0;
    vi.mocked(statSync).mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        return { isDirectory: () => true, isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }
      if (callCount === 2) {
        return { isDirectory: () => true, isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }

      return { isDirectory: () => false, isFile: () => true } as unknown as ReturnType<
        typeof statSync
      >;
    });

    const mockDirents = [
      { isDirectory: () => true, name: "en-US" },
      { isDirectory: () => true, name: "zh-CN" },
      { isDirectory: () => true, name: "zh-TW" },
    ] as unknown as ReturnType<typeof readdirSync>;

    const mockFileStrings = ["en-US.json", "nested.json"] as unknown as ReturnType<
      typeof readdirSync
    >;

    let readdirCallCount = 0;
    vi.mocked(readdirSync).mockImplementation(() => {
      readdirCallCount++;
      if (readdirCallCount === 1) {
        return mockDirents;
      }
      return mockFileStrings;
    });

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: undefined,
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(3);
    expect(result.files![0].id).toBe(1);
    expect(result.files![1].id).toBe(2);
    expect(result.files![2].id).toBe(3);
    expect(consoleSpy).toHaveBeenCalledWith("Found 3 file(s) to process:");
  });

  it("should scan a single file", async () => {
    const { statSync, readdirSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    const mockEmptyDirents = [] as unknown as ReturnType<typeof readdirSync>;
    vi.mocked(readdirSync).mockReturnValue(mockEmptyDirents);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en-US/en-US.json",
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(1);
    expect(result.files![0].id).toBe(1);
    expect(result.files![0].relativePath).toBe("en-US.json");
    expect(consoleSpy).toHaveBeenCalled();
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

  it("should throw error when source path is outside locales directory", async () => {
    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "/tmp/outside.json",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Source path must be within the locales directory",
    );
  });

  it("should accept absolute path within locales directory", async () => {
    const { statSync, readdirSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    vi.mocked(readdirSync).mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

    const absolutePath = resolve(mockConfig.localesDir, "en-US/en-US.json");
    const state = {
      config: mockConfig,
      files: [],
      sourcePath: absolutePath,
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(1);
    expect(result.files![0].absolutePath).toBe(absolutePath);
    expect(result.files![0].relativePath).toBe("en-US.json");
  });

  it("should throw error when file is not JSON", async () => {
    const { statSync, readdirSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    vi.mocked(readdirSync).mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en-US/file.txt",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Source file must be a JSON file",
    );
  });

  it("should throw error when path is invalid", async () => {
    const { statSync, readdirSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => false,
    } as unknown as ReturnType<typeof statSync>);

    vi.mocked(readdirSync).mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: "./tests/fixture/locales/en-US/en-US.json",
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Invalid path",
    );
  });

  it("should use fallback when source locale directory cannot be determined", async () => {
    const { statSync, readdirSync } = await import("fs");

    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as ReturnType<typeof statSync>);

    vi.mocked(readdirSync).mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: resolve(mockConfig.localesDir, "custom/subdir/file.json"),
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Cannot determine source locale directory from path",
    );
  });

  it("should throw error when source locale directory not found in scan all mode", async () => {
    const { readdirSync } = await import("fs");

    vi.mocked(readdirSync).mockReturnValue([] as unknown as ReturnType<typeof readdirSync>);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: undefined,
    };

    await expect(scanFilesNode(state as typeof ScanFilesAnnotation.State)).rejects.toThrow(
      "Source locale directory not found: en-US",
    );
  });

  it("should skip non-directory entries when finding locale directory", async () => {
    const { readdirSync, statSync } = await import("fs");

    const mockDirents = [
      { isDirectory: () => false, name: "some-file.txt" },
      { isDirectory: () => true, name: "en-US" },
      { isDirectory: () => false, name: "another-file.json" },
    ] as unknown as ReturnType<typeof readdirSync>;

    vi.mocked(readdirSync).mockReturnValueOnce(mockDirents);

    let callCount = 0;
    vi.mocked(statSync).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { isDirectory: () => true, isFile: () => false } as unknown as ReturnType<
          typeof statSync
        >;
      }
      return { isDirectory: () => false, isFile: () => true } as unknown as ReturnType<
        typeof statSync
      >;
    });

    const mockFileStrings = ["en-US.json"] as unknown as ReturnType<typeof readdirSync>;
    vi.mocked(readdirSync).mockReturnValueOnce(mockFileStrings);

    const state = {
      config: mockConfig,
      files: [],
      sourcePath: undefined,
    };

    const result = await scanFilesNode(state as typeof ScanFilesAnnotation.State);

    expect(result.files).toBeDefined();
    expect(result.files!).toHaveLength(1);
  });
});
