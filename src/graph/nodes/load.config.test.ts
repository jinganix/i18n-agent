import { describe, it, expect, vi } from "vitest";
import { loadConfigNode, SyncAnnotation, SyncConfig } from "./load.config.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  resolve: vi.fn((p) => p),
}));

describe("load.config", () => {
  it("should load config successfully", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const mockConfig = {
      api: {
        apiKey: "sk-test-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        timeout: 30000,
      },
      localesDir: "./locales",
      sourceLocale: "en-US",
      targetLocales: ["ja", "zh"],
      tokenSize: 3000,
    };

    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

    const state = {
      config: null,
      configPath: "tests/fixture/i18n-agent.config.json",
    };

    const result = await loadConfigNode(state as typeof SyncAnnotation.State);

    expect(result.config).toEqual(mockConfig);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should throw error when config file is invalid", async () => {
    const errorSpy = vi.spyOn(console, "error");

    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    const state = {
      config: null,
      configPath: "invalid.json",
    };

    await expect(loadConfigNode(state as typeof SyncAnnotation.State)).rejects.toThrow(
      "File not found",
    );
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("should handle JSON parse error", async () => {
    const errorSpy = vi.spyOn(console, "error");

    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValue("invalid json");

    const state = {
      config: null,
      configPath: "tests/fixture/i18n-agent.config.json",
    };

    await expect(loadConfigNode(state as typeof SyncAnnotation.State)).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("should test annotation reducer behavior for config", () => {
    const configReducer = (x: SyncConfig | null, y: SyncConfig | null): SyncConfig | null => y ?? x;

    const newValue: SyncConfig = {
      localesDir: "./locales",
      sourceLocale: "en-US",
      targetLocales: ["zh"],
    };
    expect(configReducer(null, newValue)).toEqual(newValue);

    const existingValue: SyncConfig = {
      localesDir: "./existing",
      sourceLocale: "fr",
      targetLocales: ["en"],
    };
    expect(configReducer(existingValue, null)).toEqual(existingValue);
  });

  it("should test annotation reducer behavior for configPath", () => {
    const configPathReducer = (x: string, y: string): string => y ?? x;

    expect(configPathReducer("", "new/path.json")).toBe("new/path.json");

    expect(configPathReducer("existing/path.json", "")).toBe("");
  });
});
