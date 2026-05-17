import { describe, it, expect } from "vitest";
import { replaceReducer } from "./langgraph.helpers.js";

describe("langgraph.helpers", () => {
  it("should return new value when provided", () => {
    expect(replaceReducer("old", "new")).toBe("new");
  });

  it("should keep current value when new value is null", () => {
    expect(replaceReducer("current", null)).toBe("current");
  });

  it("should keep current value when new value is undefined", () => {
    expect(replaceReducer("current", undefined)).toBe("current");
  });

  it("should handle object types", () => {
    const oldObj = { key: "old" };
    const newObj = { key: "new" };
    expect(replaceReducer(oldObj, newObj)).toEqual(newObj);
  });

  it("should keep current object when new value is null", () => {
    const currentObj = { key: "value" };
    expect(replaceReducer(currentObj, null)).toEqual(currentObj);
  });

  it("should handle array types", () => {
    expect(replaceReducer([1, 2, 3], [4, 5, 6])).toEqual([4, 5, 6]);
  });

  it("should keep current array when new value is null", () => {
    const currentArr = [1, 2, 3];
    expect(replaceReducer(currentArr, null)).toEqual(currentArr);
  });

  it("should handle number types", () => {
    expect(replaceReducer(10, 20)).toBe(20);
  });

  it("should keep current number when new value is null", () => {
    expect(replaceReducer(10, null)).toBe(10);
  });

  it("should handle boolean types", () => {
    expect(replaceReducer(false, true)).toBe(true);
  });

  it("should keep current boolean when new value is null", () => {
    expect(replaceReducer(true, null)).toBe(true);
  });
});
