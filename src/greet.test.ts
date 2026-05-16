import { describe, expect, test } from "vitest";
import { greet } from "@/greet";

describe("greet", () => {
  test.each([
    ["World", "Hello, World!"],
    ["TypeScript", "Hello, TypeScript!"],
    ["Vitest", "Hello, Vitest!"],
    ["", "Hello, !"],
  ])("greet('%s') -> '%s'", (name, expected) => {
    expect(greet(name)).toBe(expected);
  });
});
