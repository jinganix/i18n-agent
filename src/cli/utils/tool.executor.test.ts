import { describe, it, expect, vi } from "vitest";
import { executeToolCall } from "./tool.executor.js";

vi.mock("../commands/sync.js", () => ({
  executeSync: vi.fn(() => Promise.resolve()),
}));

vi.mock("../commands/diff.js", () => ({
  executeDiff: vi.fn(() => Promise.resolve()),
}));

describe("commands/tool.executor", () => {
  it("should execute sync tool successfully", async () => {
    const result = await executeToolCall("sync", {
      config: "./test-config.json",
      dryRun: true,
      source: "foo.json",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Files synced successfully");
  });

  it("should fail sync without config parameter", async () => {
    const result = await executeToolCall("sync", {
      source: "foo.json",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Missing required parameter: config");
  });

  it("should use default config path when not provided in parameters", async () => {
    const result = await executeToolCall(
      "sync",
      {
        source: "foo.json",
      },
      "./default-config.json",
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Files synced successfully");
  });

  it("should execute diff tool successfully", async () => {
    const result = await executeToolCall("diff", {
      format: "text",
      source: "en.json",
      target: "zh.json",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Diff analysis completed");
  });

  it("should fail diff without required parameters", async () => {
    const result = await executeToolCall("diff", {
      source: "en.json",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Missing required parameters");
  });

  it("should return error for unknown tool", async () => {
    const result = await executeToolCall("unknown_tool", {});

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown tool");
  });
});
