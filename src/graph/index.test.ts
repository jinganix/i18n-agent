import { describe, it, expect, vi } from "vitest";
import { runWorkflow, syncWorkflow } from "./index.js";

describe("graph/index", () => {
  it("should run workflow and output hello world", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runWorkflow();
    expect(consoleSpy).toHaveBeenCalledWith("hello world");
    consoleSpy.mockRestore();
  });

  it("should sync workflow and load config", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should sync workflow with source path", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/i18n-agent.config.json", "tests/locales/en/en.json");

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should flatten keys in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/i18n-agent.config.json");

    // Should log file flattening
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Flattened file"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Total files flattened"));

    consoleSpy.mockRestore();
  });

  it("should build tasks in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Built"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Batch"));

    consoleSpy.mockRestore();
  });

  it("should translate in sync workflow", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await syncWorkflow("tests/i18n-agent.config.json");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Translating batch"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Translation completed"));

    consoleSpy.mockRestore();
  });
});
