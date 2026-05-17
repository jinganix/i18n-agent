import { describe, it, expect } from "vitest";
import { estimateTokens, estimateObjectTokens } from "./token.estimator.js";

describe("token.estimator", () => {
  it("should estimate tokens for text", () => {
    const tokens = estimateTokens("Hello world");
    expect(tokens).toBeGreaterThan(0);
  });

  it("should estimate tokens for object", () => {
    const obj = { key: "value", nested: { data: 123 } };
    const tokens = estimateObjectTokens(obj);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should return higher token count for larger text", () => {
    const smallText = "Hello";
    const largeText = "Hello world this is a longer text with more words";

    const smallTokens = estimateTokens(smallText);
    const largeTokens = estimateTokens(largeText);

    expect(largeTokens).toBeGreaterThan(smallTokens);
  });
});
