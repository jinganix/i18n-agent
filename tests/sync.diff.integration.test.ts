import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
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

        const translatedData: Record<string, string> = {};
        for (const key of task.keys) {
          const originalKey = key.prefixedKey.split(".").slice(1).join(".");

          let found = false;

          const possibleFiles = [`${locale}.json`, "nested.json"];
          for (const fileName of possibleFiles) {
            const filePath = join(fixtureDir, "locales", locale, fileName);
            if (existsSync(filePath)) {
              try {
                const content = readFileSync(filePath, "utf-8");
                const fileContent = JSON.parse(content);
                const value = getNestedValue(fileContent, originalKey);
                if (value !== undefined) {
                  translatedData[key.prefixedKey] = value === null ? "null" : String(value);
                  found = true;
                  break;
                }
              } catch {
                // Continue to next file
              }
            }
          }

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

describe("sync workflow integration test - diff mode", () => {
  const fixtureDir = join(process.cwd(), "tests/fixture");
  const configPath = join(fixtureDir, "i18n-agent.config.json");
  const outputDir = join(process.cwd(), ".tmp/tests-output-diff");

  beforeAll(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(outputDir, { force: true, recursive: true });
  });

  it("should preserve extra keys in target", async () => {
    const modifiedConfigPath = join(outputDir, "config-diff-more.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "diff",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en");
    const testZhDir = join(testLocalesDir, "zh");

    mkdirSync(testEnDir, { recursive: true });
    mkdirSync(testZhDir, { recursive: true });

    const enContent = {
      key1: "value1",
      key2: "value2",
    };

    const zhContent = {
      key1: "值1",
      key2: "值2",
      key3: "值3",
      key4: "值4",
    };

    writeFileSync(join(testEnDir, "en.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "zh.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh", "zh.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(Object.keys(actualZhContent)).toHaveLength(4);
    expect(actualZhContent.key1).toBeDefined();
    expect(actualZhContent.key2).toBeDefined();
    expect(actualZhContent.key3).toBe("值3");
    expect(actualZhContent.key4).toBe("值4");
  });

  it("should translate only new keys when target has fewer keys", async () => {
    const modifiedConfigPath = join(outputDir, "config-diff-fewer.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "diff",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en");
    const testZhDir = join(testLocalesDir, "zh");

    mkdirSync(testEnDir, { recursive: true });
    mkdirSync(testZhDir, { recursive: true });

    const enContent = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
      key4: "value4",
    };

    const zhContent = {
      key1: "值1",
    };

    writeFileSync(join(testEnDir, "en.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "zh.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh", "zh.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(Object.keys(actualZhContent)).toHaveLength(4);
    expect(actualZhContent.key1).toBe("值1");
    expect(actualZhContent.key2).toBeDefined();
    expect(actualZhContent.key3).toBeDefined();
    expect(actualZhContent.key4).toBeDefined();
  });

  it("should merge different keys from target and source", async () => {
    const modifiedConfigPath = join(outputDir, "config-diff-different.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "diff",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en");
    const testZhDir = join(testLocalesDir, "zh");

    mkdirSync(testEnDir, { recursive: true });
    mkdirSync(testZhDir, { recursive: true });

    const enContent = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    const zhContent = {
      key1: "值1",
      key4: "值4",
      key5: "值5",
    };

    writeFileSync(join(testEnDir, "en.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "zh.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh", "zh.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(Object.keys(actualZhContent)).toHaveLength(5);
    expect(actualZhContent.key1).toBe("值1");
    expect(actualZhContent.key2).toBeDefined();
    expect(actualZhContent.key3).toBeDefined();
    expect(actualZhContent.key4).toBe("值4");
    expect(actualZhContent.key5).toBe("值5");
  });

  it("should preserve existing keys and translate new ones with nested objects", async () => {
    const modifiedConfigPath = join(outputDir, "config-diff-nested.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "diff",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en");
    const testZhDir = join(testLocalesDir, "zh");

    mkdirSync(testEnDir, { recursive: true });
    mkdirSync(testZhDir, { recursive: true });

    const enContent = {
      user: {
        age: 30,
        email: "john@example.com",
        name: "John",
      },
    };

    const zhContent = {
      extra: "额外内容",
      user: {
        name: "约翰",
      },
    };

    writeFileSync(join(testEnDir, "nested.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "nested.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh", "nested.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(actualZhContent.user).toBeDefined();
    expect(actualZhContent.user.name).toBe("约翰");
    expect(actualZhContent.user.age).toBeDefined();
    expect(actualZhContent.user.email).toBeDefined();
    expect(actualZhContent.extra).toBe("额外内容");
  });
});
