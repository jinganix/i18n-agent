import { describe, it, expect, vi } from "vitest";
import { normalizeNode, NormalizeAnnotation } from "./normalize.node.js";

describe("normalize.node", () => {
  it("should normalize nested keys and output result", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const state = {
      input: {
        user: {
          name: "John",
          profile: {
            age: 30,
          },
        },
      },
      output: null,
    };

    const result = await normalizeNode(state as typeof NormalizeAnnotation.State);

    expect(result.output).toEqual({
      "user.name": "John",
      "user.profile.age": 30,
    });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle flat object", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    const state = {
      input: {
        key1: "value1",
        key2: "value2",
      },
      output: null,
    };

    const result = await normalizeNode(state as typeof NormalizeAnnotation.State);

    expect(result.output).toEqual({
      key1: "value1",
      key2: "value2",
    });

    consoleSpy.mockRestore();
  });
});
