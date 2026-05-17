import { describe, it, expect, vi } from "vitest";
import { detectChanges } from "./detect.changes.ts";

describe("detect.changes", () => {
  it("should output hello world and return messages", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const result = await detectChanges({ messages: [] });

    expect(consoleSpy).toHaveBeenCalledWith("hello world");
    expect(result.messages).toEqual(["hello world"]);

    consoleSpy.mockRestore();
  });
});
