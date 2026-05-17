import { get_encoding } from "@dqbd/tiktoken";

let encoder: ReturnType<typeof get_encoding> | null = null;

function initEncoder(): void {
  if (!encoder) {
    encoder = get_encoding("cl100k_base");
  }
}

export function estimateTokens(text: string): number {
  initEncoder();
  const tokens = encoder!.encode(text);
  return tokens.length;
}

export function estimateObjectTokens(obj: Record<string, unknown>): number {
  const jsonString = JSON.stringify(obj);
  return estimateTokens(jsonString);
}
