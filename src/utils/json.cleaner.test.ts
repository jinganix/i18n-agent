import { describe, it, expect } from "vitest";
import { cleanJson } from "./json.cleaner.js";

describe("utils/json.cleaner", () => {
  it("should return clean JSON object as-is", () => {
    const input = '{"key": "value"}';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should return clean JSON array as-is", () => {
    const input = '[{"key": "value"}]';
    expect(cleanJson(input)).toBe('[{"key": "value"}]');
  });

  it("should remove markdown code blocks with json", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should remove markdown code blocks without json", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should remove json prefix", () => {
    const input = 'json {"key": "value"}';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should remove JSON: prefix", () => {
    const input = 'JSON: {"key": "value"}';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should extract JSON from text with prefix and suffix", () => {
    const input = 'Here is the result: {"key": "value"} some extra text';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should handle JSON array with extra text", () => {
    const input = 'Response: [{"key": "value"}] end';
    expect(cleanJson(input)).toBe('[{"key": "value"}]');
  });

  it("should handle nested JSON objects", () => {
    const input = '```json\n{"outer": {"inner": "value"}}\n```';
    expect(cleanJson(input)).toBe('{"outer": {"inner": "value"}}');
  });

  it("should trim whitespace", () => {
    const input = '  {"key": "value"}  ';
    expect(cleanJson(input)).toBe('{"key": "value"}');
  });

  it("should handle complex markdown block", () => {
    const input = '```json\n{\n  "key": "value"\n}\n```';
    expect(cleanJson(input)).toBe('{\n  "key": "value"\n}');
  });

  it("should return original string when no braces found", () => {
    const input = "no json here";
    expect(cleanJson(input)).toBe("no json here");
  });

  it("should return original string when only opening brace found", () => {
    const input = "{no closing brace";
    expect(cleanJson(input)).toBe("{no closing brace");
  });

  it("should return original string when only closing brace found", () => {
    const input = "no opening brace}";
    expect(cleanJson(input)).toBe("no opening brace}");
  });

  it("should return original string when closing brace before opening brace", () => {
    const input = "}before{";
    expect(cleanJson(input)).toBe("}before{");
  });

  it("should extract from first opening to last closing brace", () => {
    const input = '[{"a": 1}] {"b": 2}';
    expect(cleanJson(input)).toBe('[{"a": 1}] {"b": 2}');
  });

  it("should handle empty object", () => {
    const input = "{}";
    expect(cleanJson(input)).toBe("{}");
  });

  it("should handle empty array", () => {
    const input = "[]";
    expect(cleanJson(input)).toBe("[]");
  });

  it("should extract from first opening to last closing brace with text", () => {
    const input = 'text [1, 2] more text {"key": "value"} end';
    expect(cleanJson(input)).toBe('[1, 2] more text {"key": "value"}');
  });
});
