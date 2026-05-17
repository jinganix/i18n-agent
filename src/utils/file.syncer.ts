import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface SyncFileResult {
  filePath: string;
  keyCount: number;
}

export function restoreNestedStructure(
  flattenedData: Record<string, string | number | boolean | null>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flattenedData)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  return result;
}

export function syncTranslationToFile(
  targetPath: string,
  translatedData: Record<string, string | number | boolean | null>,
): SyncFileResult {
  const nestedData = restoreNestedStructure(translatedData);
  const dir = dirname(targetPath);

  mkdirSync(dir, { recursive: true });
  writeFileSync(targetPath, JSON.stringify(nestedData, null, 2) + "\n", "utf-8");

  return {
    filePath: targetPath,
    keyCount: Object.keys(translatedData).length,
  };
}
