import { describe, it, expect } from "vitest";
import { normalizeKeys } from "./normalize.keys.js";

describe("normalize.keys", () => {
  it("should flatten nested object keys with dot notation", () => {
    const input = {
      a: {
        b: {
          c: "value",
        },
      },
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      "a.b.c": "value",
    });
  });

  it("should handle multiple nested levels", () => {
    const input = {
      items: null,
      user: {
        name: "John",
        profile: {
          active: true,
          age: 30,
        },
      },
      welcome: "Hello",
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      items: null,
      "user.name": "John",
      "user.profile.active": true,
      "user.profile.age": 30,
      welcome: "Hello",
    });
  });

  it("should handle empty object", () => {
    const input = {};
    const result = normalizeKeys(input);
    expect(result).toEqual({});
  });

  it("should handle flat object", () => {
    const input = {
      key1: "value1",
      key2: "value2",
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      key1: "value1",
      key2: "value2",
    });
  });

  it("should handle mixed nested and flat keys", () => {
    const input = {
      another: "another value",
      nested: {
        deep: "deep value",
      },
      simple: "value",
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      another: "another value",
      "nested.deep": "deep value",
      simple: "value",
    });
  });

  it("should preserve primitive values", () => {
    const input = {
      boolean: false,
      nullable: null,
      number: 42,
      string: "text",
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      boolean: false,
      nullable: null,
      number: 42,
      string: "text",
    });
  });

  it("should handle deeply nested structure", () => {
    const input = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: "deep",
            },
          },
        },
      },
    };

    const result = normalizeKeys(input);

    expect(result).toEqual({
      "level1.level2.level3.level4.value": "deep",
    });
  });

  it("should use custom prefix when provided", () => {
    const input = {
      key: "value",
    };

    const result = normalizeKeys(input, "prefix");

    expect(result).toEqual({
      "prefix.key": "value",
    });
  });
});
