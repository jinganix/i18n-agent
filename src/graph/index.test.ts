import { describe, it, expect, vi } from "vitest";
import { runWorkflow, syncWorkflow } from "./index.js";

describe("graph/index", () => {
  it("should run workflow and output hello world", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await runWorkflow();
    expect(consoleSpy).toHaveBeenCalledWith("hello world");
    consoleSpy.mockRestore();
  });

  it("should sync workflow and normalize keys", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const input = {
      user: {
        name: "John",
        profile: {
          age: 30,
        },
      },
    };

    await syncWorkflow(input);

    expect(consoleSpy).toHaveBeenCalled();
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output).toEqual({
      "user.name": "John",
      "user.profile.age": 30,
    });

    consoleSpy.mockRestore();
  });
});
