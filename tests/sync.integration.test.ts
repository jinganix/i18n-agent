import { mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { syncWorkflow } from "@/graph/index.js";

vi.mock("@/utils/api.client.js", () => ({
  getPromptForLocale: vi.fn((locale) => {
    return `Translate to ${locale}`;
  }),
  loadPrompt: vi.fn((locale) => {
    return `Translate to ${locale}`;
  }),
}));

vi.mock("@/graph/nodes/translate.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const { readFileSync, existsSync } = await import("fs");
  const { join } = await import("path");

  // Helper function to get nested value from object using dot notation
  const getNestedValue = (
    obj: Record<string, unknown>,
    path: string,
  ): string | number | boolean | null | undefined => {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (current === undefined || current === null || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current as string | number | boolean | null | undefined;
  };

  return {
    ...actual,
    translateNode: vi.fn(async (state) => {
      const translatedResults: Record<string, Record<string, string>> = {};
      const fixtureDir = join(process.cwd(), "tests/fixture");

      for (const task of state.tasks) {
        const batchKey = `batch_${task.batchId}`;
        const locale = task.locale;

        // For each key, try to find its translation in fixture files
        const translatedData: Record<string, string> = {};
        for (const key of task.keys) {
          const originalKey = key.prefixedKey.split(".").slice(1).join(".");

          // Try to find the translation in all fixture files for this locale
          let found = false;

          // Check both locale.json and nested.json
          const possibleFiles = [`${locale}.json`, "nested.json"];
          for (const fileName of possibleFiles) {
            const filePath = join(fixtureDir, "locales", locale, fileName);
            if (existsSync(filePath)) {
              try {
                const content = readFileSync(filePath, "utf-8");
                const fileContent = JSON.parse(content);
                const value = getNestedValue(fileContent, originalKey);
                if (value !== undefined) {
                  // Convert to string like the real translateNode does
                  translatedData[key.prefixedKey] = value === null ? "null" : String(value);
                  found = true;
                  break;
                }
              } catch {
                // Continue to next file
              }
            }
          }

          // Fallback: convert to string
          if (!found) {
            translatedData[key.prefixedKey] = String(key.value);
          }
        }

        translatedResults[batchKey] = translatedData;
      }

      return { translatedResults };
    }),
  };
});

describe("sync workflow integration test", () => {
  const fixtureDir = join(process.cwd(), "tests/fixture");
  const configPath = join(fixtureDir, "i18n-agent.config.json");
  const outputDir = join(process.cwd(), ".tmp/tests-output");

  beforeAll(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(outputDir, { force: true, recursive: true });
  });

  it("should translate en files and match expected zh/ru/fr/ar results", async () => {
    const modifiedConfigPath = join(outputDir, "config.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
    };

    const { writeFileSync, mkdirSync: mkDir } = await import("fs");
    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en");

    mkDir(testEnDir, { recursive: true });

    const enFiles = ["en.json", "nested.json"];
    for (const file of enFiles) {
      const sourcePath = join(fixtureDir, "locales", "en", file);
      const targetPath = join(testEnDir, file);
      const content = readFileSync(sourcePath, "utf-8");
      writeFileSync(targetPath, content);
    }

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    // Check all target locales
    const targetLocales = ["zh", "ru", "fr", "ar"];

    for (const locale of targetLocales) {
      const expectedDir = join(fixtureDir, "locales", locale);
      const actualDir = join(testLocalesDir, locale);
      const files = [`${locale}.json`, "nested.json"];

      for (const file of files) {
        const expectedPath = join(expectedDir, file);
        const actualPath = join(actualDir, file);

        expect(readFileSync(actualPath, "utf-8")).toBeDefined();

        const expectedContent = JSON.parse(readFileSync(expectedPath, "utf-8"));
        const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));

        // Compare keys exist and have translated values (as strings)
        for (const key of Object.keys(expectedContent)) {
          expect(actualContent[key]).toBeDefined();
          const expectedValue = expectedContent[key];
          const actualValue = actualContent[key];

          // Helper function to compare values recursively
          const compareValues = (expected: unknown, actual: unknown): void => {
            if (expected === null) {
              expect(actual).toBe("null");
            } else if (typeof expected === "object" && !Array.isArray(expected)) {
              // For nested objects, compare each property
              const expectedObj = expected as Record<string, unknown>;
              const actualObj = actual as Record<string, unknown>;
              for (const nestedKey of Object.keys(expectedObj)) {
                expect(actualObj[nestedKey]).toBeDefined();
                compareValues(expectedObj[nestedKey], actualObj[nestedKey]);
              }
            } else {
              // For primitives, convert both to string and compare
              expect(String(actual)).toBe(String(expected));
            }
          };

          compareValues(expectedValue, actualValue);
        }
      }
    }
  });

  it("should preserve data types correctly", async () => {
    const modifiedConfigPath = join(outputDir, "config2.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales2"),
    };

    const { writeFileSync, mkdirSync: mkDir } = await import("fs");
    const testLocalesDir = join(outputDir, "test-locales2");
    const testEnDir = join(testLocalesDir, "en");

    mkDir(testEnDir, { recursive: true });

    const sourcePath = join(fixtureDir, "locales", "en", "nested.json");
    const targetPath = join(testEnDir, "nested.json");
    const content = readFileSync(sourcePath, "utf-8");
    writeFileSync(targetPath, content);

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualRuPath = join(testLocalesDir, "ru", "nested.json");
    const actualRuContent = JSON.parse(readFileSync(actualRuPath, "utf-8"));

    expect(actualRuContent.user.profile.age).toBe("30");
    expect(actualRuContent.user.profile.active).toBe("true");
    expect(actualRuContent.items).toBe("null");
  });

  it("should handle placeholder strings correctly", async () => {
    const modifiedConfigPath = join(outputDir, "config3.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales3"),
    };

    const { writeFileSync, mkdirSync: mkDir } = await import("fs");
    const testLocalesDir = join(outputDir, "test-locales3");
    const testEnDir = join(testLocalesDir, "en");

    mkDir(testEnDir, { recursive: true });

    const sourcePath = join(fixtureDir, "locales", "en", "en.json");
    const targetPath = join(testEnDir, "en.json");
    const content = readFileSync(sourcePath, "utf-8");
    writeFileSync(targetPath, content);

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualRuPath = join(testLocalesDir, "ru", "ru.json");
    const actualZhPath = join(testLocalesDir, "zh", "zh.json");

    const actualRuContent = JSON.parse(readFileSync(actualRuPath, "utf-8"));
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(actualRuContent.hello).toBe("Привет, {name}");
    expect(actualRuContent.items_count).toBe("{count} элементов");
    expect(actualZhContent.hello).toBe("你好 {name}");
    expect(actualZhContent.items_count).toBe("{count} 个项目");
  });
});
