import { describe, it, expect, vi } from "vitest";
import { loadConfigNode, SyncAnnotation } from "./load.config.js";

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
      sourceLocale: "en",
      targetLocales: ["ja", "zh"],
      tokenSize: 3000,
    };

    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

    const state = {
      config: null,
      configPath: "tests/i18n-agent.config.json",
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
});
