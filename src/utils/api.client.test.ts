import { describe, it, expect, vi } from "vitest";
import { callTranslationApi, getPromptForLocale, loadPrompt } from "./api.client.js";

vi.stubGlobal("fetch", vi.fn());

describe("api.client", () => {
  it("should load prompt with replacements", () => {
    const template = "Translate from {sourceLocale} to {targetLocale}";
    const result = loadPrompt(template, {
      sourceLocale: "en-US",
      targetLocale: "ja-JP",
    });

    expect(result).toBe("Translate from en-US to ja-JP");
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

  it("should return translated content from API", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        choices: [{ message: { content: '{"key": "translated"}' } }],
      }),
      ok: true,
    } as Response);

    const result = await callTranslationApi(
      { apiKey: "test", baseUrl: "https://test.com" },
      { messages: [{ content: "test", role: "user" }], model: "gpt-4" },
    );
    expect(result).toBe('{"key": "translated"}');
  });

  it("should throw error when API response is not ok", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    await expect(
      callTranslationApi(
        { apiKey: "invalid", baseUrl: "https://test.com" },
        { messages: [], model: "test" },
      ),
    ).rejects.toThrow("API request failed: 401 Unauthorized");
  });

  it("should handle API timeout", async () => {
    const mockFetch = vi.mocked(fetch);
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(
      callTranslationApi(
        { apiKey: "test", baseUrl: "https://test.com", timeout: 1000 },
        { messages: [], model: "test" },
      ),
    ).rejects.toThrow("API request timeout after 1000ms");
  });

  it("should handle other API errors", async () => {
    const mockFetch = vi.mocked(fetch);
    const networkError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(
      callTranslationApi(
        { apiKey: "test", baseUrl: "https://test.com" },
        { messages: [], model: "test" },
      ),
    ).rejects.toThrow("Network error");
  });

  it("should use default timeout when not specified", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ choices: [{ message: { content: "result" } }] }),
      ok: true,
    } as Response);

    const result = await callTranslationApi(
      { apiKey: "test", baseUrl: "https://test.com" },
      { messages: [], model: "test" },
    );
    expect(result).toBe("result");
  });

  it("should handle timeout with default timeout value", async () => {
    const mockFetch = vi.mocked(fetch);
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(
      callTranslationApi(
        { apiKey: "test", baseUrl: "https://test.com" },
        { messages: [], model: "test" },
      ),
    ).rejects.toThrow("API request timeout after 30000ms");
  });
});
