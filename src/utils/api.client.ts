import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface TranslationRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

export interface TranslationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function loadPrompt(template: string, replacements: Record<string, string>): string {
  let prompt = template;
  for (const [key, value] of Object.entries(replacements)) {
    prompt = prompt.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return prompt;
}

export function getPromptForLocale(targetLocale: string): string {
  const promptDir = resolve(__dirname, "../prompts");
  const localePrompt = `${promptDir}/translate.${targetLocale}.md`;
  const defaultPrompt = `${promptDir}/translate.default.md`;

  try {
    return readFileSync(localePrompt, "utf-8");
  } catch {
    return readFileSync(defaultPrompt, "utf-8");
  }
}

export async function callTranslationApi(
  config: ApiConfig,
  request: TranslationRequest,
): Promise<string> {
  const controller = new AbortController();
  // c8 ignore next
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      body: JSON.stringify(request),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TranslationResponse;
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`API request timeout after ${config.timeout || 30000}ms`);
    }
    throw error;
  }
}
