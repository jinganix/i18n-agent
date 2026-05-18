import { describe, it, expect } from "vitest";
import { replaceReducer } from "./langgraph.helpers.js";

describe("langgraph.helpers", () => {
  describe("replaceReducer", () => {
    it("should return new value when not null or undefined", () => {
      const result = replaceReducer("old", "new");
      expect(result).toBe("new");
    });

    it("should return old value when new value is null", () => {
      const result = replaceReducer("old", null as unknown as string);
      expect(result).toBe("old");
    });

    it("should return old value when new value is undefined", () => {
      const result = replaceReducer("old", undefined as unknown as string);
      expect(result).toBe("old");
    });

    it("should handle number types", () => {
      expect(replaceReducer(1, 2)).toBe(2);
      expect(replaceReducer(1, null as unknown as number)).toBe(1);
    });

    it("should handle object types", () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      expect(replaceReducer(obj1, obj2)).toBe(obj2);
      expect(replaceReducer(obj1, null as unknown as typeof obj1)).toBe(obj1);
    });
  });
});
