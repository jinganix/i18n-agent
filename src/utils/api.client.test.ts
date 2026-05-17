import { describe, it, expect, vi } from "vitest";
import { callTranslationApi, getPromptForLocale, loadPrompt } from "./api.client.js";

vi.stubGlobal("fetch", vi.fn());

describe("api.client", () => {
  it("should load prompt with replacements", () => {
    const template = "Translate from {sourceLocale} to {targetLocale}";
    const result = loadPrompt(template, {
      sourceLocale: "en",
      targetLocale: "ja",
    });

    expect(result).toBe("Translate from en to ja");
  });

  it("should handle multiple replacements", () => {
    const template = "{a} {b} {c}";
    const result = loadPrompt(template, {
      a: "1",
      b: "2",
      c: "3",
    });

    expect(result).toBe("1 2 3");
  });

  it("should get prompt for specific locale", () => {
    const jaPrompt = getPromptForLocale("ja");
    expect(jaPrompt).toContain("Japanese");
  });

  it("should fallback to default prompt for unknown locale", () => {
    const unknownPrompt = getPromptForLocale("unknown");
    expect(unknownPrompt).toContain("professional translator");
  });

  it("should return empty string for translation API call", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ choices: [{ message: { content: "" } }] }),
      ok: true,
    } as Response);

    const result = await callTranslationApi(
      { apiKey: "test", baseUrl: "https://test.com" },
      { messages: [], model: "test" },
    );
    expect(result).toBe("");
  });
});
