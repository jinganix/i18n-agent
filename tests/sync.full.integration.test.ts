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
                // ignore
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

describe("sync workflow integration test - full mode", () => {
  const fixtureDir = join(process.cwd(), "tests/fixture");
  const configPath = join(fixtureDir, "i18n-agent.config.json");
  const outputDir = join(process.cwd(), ".tmp/tests-output-full");

  beforeAll(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(outputDir, { force: true, recursive: true });
  });

  it("should replace target when it has more keys than source", async () => {
    const modifiedConfigPath = join(outputDir, "config-full-more.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "full",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en-US");
    const testZhDir = join(testLocalesDir, "zh-CN");

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

    writeFileSync(join(testEnDir, "en-US.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "zh-CN.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh-CN", "zh-CN.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(Object.keys(actualZhContent)).toHaveLength(2);
    expect(actualZhContent.key1).toBeDefined();
    expect(actualZhContent.key2).toBeDefined();
    expect(actualZhContent.key3).toBeUndefined();
    expect(actualZhContent.key4).toBeUndefined();
  });

  it("should complete target when it has fewer keys than source", async () => {
    const modifiedConfigPath = join(outputDir, "config-full-fewer.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "full",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en-US");
    const testZhDir = join(testLocalesDir, "zh-CN");

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

    writeFileSync(join(testEnDir, "en-US.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "zh-CN.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh-CN", "zh-CN.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(Object.keys(actualZhContent)).toHaveLength(4);
    expect(actualZhContent.key1).toBeDefined();
    expect(actualZhContent.key2).toBeDefined();
    expect(actualZhContent.key3).toBeDefined();
    expect(actualZhContent.key4).toBeDefined();
  });

  it("should completely replace target with nested objects", async () => {
    const modifiedConfigPath = join(outputDir, "config-full-nested.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
      mode: "full",
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en-US");
    const testZhDir = join(testLocalesDir, "zh-CN");

    mkdirSync(testEnDir, { recursive: true });
    mkdirSync(testZhDir, { recursive: true });

    const enContent = {
      settings: {
        theme: "dark",
      },
      user: {
        age: 30,
        name: "John",
      },
    };

    const zhContent = {
      extra: "额外内容",
      settings: {
        theme: "暗色",
      },
      user: {
        age: 30,
        name: "约翰",
      },
    };

    writeFileSync(join(testEnDir, "nested.json"), JSON.stringify(enContent, null, 2));
    writeFileSync(join(testZhDir, "nested.json"), JSON.stringify(zhContent, null, 2));
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const actualZhPath = join(testLocalesDir, "zh-CN", "nested.json");
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(actualZhContent.user).toBeDefined();
    expect(actualZhContent.user.name).toBeDefined();
    expect(actualZhContent.settings).toBeDefined();
    expect(actualZhContent.extra).toBeUndefined();
  });
});
