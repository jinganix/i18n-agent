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
});
