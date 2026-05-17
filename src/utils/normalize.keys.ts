export interface NormalizedResult {
  [key: string]: string | number | boolean | null;
}

export function normalizeKeys(obj: Record<string, unknown>, prefix = ""): NormalizedResult {
  const result: NormalizedResult = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nested = normalizeKeys(value as Record<string, unknown>, newKey);
      Object.assign(result, nested);
    } else {
      result[newKey] = value as string | number | boolean | null;
    }
  }

  return result;
}
