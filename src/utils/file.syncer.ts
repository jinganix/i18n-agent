import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
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

export function mergeWithExistingData(
  targetPath: string,
  newData: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  if (!existsSync(targetPath)) {
    return newData;
  }

  try {
    const content = readFileSync(targetPath, "utf-8");
    const existingData = JSON.parse(content);

    const flatExistingData = flattenObject(existingData);

    const mergedData: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(flatExistingData)) {
      if (!(key in newData)) {
        mergedData[key] = String(value);
      }
    }

    Object.assign(mergedData, newData);

    return mergedData;
  } catch {
    return newData;
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(value as Record<string, unknown>, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
