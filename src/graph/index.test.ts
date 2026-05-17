import { describe, it, expect, vi } from "vitest";
import { runWorkflow } from "./index.ts";

describe("graph/index", () => {
  it("should run workflow and output hello world", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runWorkflow();
    expect(consoleSpy).toHaveBeenCalledWith("hello world");
    consoleSpy.mockRestore();
  });
});
