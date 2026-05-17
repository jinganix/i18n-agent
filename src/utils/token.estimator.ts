import { get_encoding } from "@dqbd/tiktoken";

const encoder = get_encoding("cl100k_base");

export function estimateTokens(text: string): number {
  const tokens = encoder.encode(text);
  return tokens.length;
}

export function estimateObjectTokens(obj: Record<string, unknown>): number {
  const jsonString = JSON.stringify(obj);
  return estimateTokens(jsonString);
}
