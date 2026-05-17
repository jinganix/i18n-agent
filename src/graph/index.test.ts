import { describe, it, expect, vi } from "vitest";
import { runWorkflow, syncWorkflow } from "./index.js";

vi.mock("@/utils/api.client.js", () => ({
  callTranslationApi: vi.fn(() =>
    Promise.resolve(
      '{"1.welcome": "Welcome", "1.goodbye": "Goodbye", "1.hello": "Hello {name}", "1.items_count": "{count} items", "1.apples": "She has {count, plural, =0 {no apples} one {# apple} other {# apples}}", "2.welcome": "Welcome", "2.user.name": "John", "2.user.profile.age": "30", "2.user.profile.active": "true", "2.items": "null"}',
    ),
  ),
  getPromptForLocale: vi.fn(() => "Mock prompt template"),
  loadPrompt: vi.fn((_template, replacements) => `Loaded: ${replacements.targetLocale}`),
}));

vi.mock("@/utils/file.syncer.js", () => ({
  restoreNestedStructure: vi.fn((data: Record<string, unknown>) => data),
  syncTranslationToFile: vi.fn(
    (targetPath: string, data: Record<string, string | number | boolean | null>) => ({
      filePath: targetPath,
      keyCount: Object.keys(data).length,
    }),
  ),
}));

describe("graph/index", () => {
  it("should run workflow and detect changes", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runWorkflow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Change detection completed"));
    consoleSpy.mockRestore();
  });

  it("should sync workflow and load config", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should sync workflow with source path", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json", "tests/fixture/locales/en/en.json");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should flatten keys in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json");

    // Should log file flattening
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Flattened file"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Total files flattened"));

    consoleSpy.mockRestore();
  });

  it("should build tasks in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Built"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch"));

    consoleSpy.mockRestore();
  });

  it("should translate in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Translating batch"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Translation completed"));

    consoleSpy.mockRestore();
  });

  it("should sync files in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/fixture/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Synced"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Total files synced"));

    consoleSpy.mockRestore();
  });
});
