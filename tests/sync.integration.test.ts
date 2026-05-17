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
  const actual = await importOriginal();
  return {
    ...actual,
    translateNode: vi.fn(async (state) => {
      const translatedResults: Record<string, Record<string, string>> = {};

      for (const task of state.tasks) {
        const batchKey = `batch_${task.batchId}`;
        const translatedData: Record<string, string> = {};

        for (const key of task.keys) {
          const value = key.value;
          if (value === null) {
            translatedData[key.prefixedKey] = "null";
          } else if (typeof value === "boolean") {
            translatedData[key.prefixedKey] = String(value);
          } else if (typeof value === "number") {
            translatedData[key.prefixedKey] = String(value);
          } else {
            translatedData[key.prefixedKey] = String(value);
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
  const outputDir = join(process.cwd(), "tests/temp-output");

  beforeAll(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(outputDir, { force: true, recursive: true });
  });

  it("should translate en files and match expected ja/zh results", async () => {
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

    const expectedJaDir = join(fixtureDir, "locales", "ja");
    const expectedZhDir = join(fixtureDir, "locales", "zh");
    const actualJaDir = join(testLocalesDir, "ja");
    const actualZhDir = join(testLocalesDir, "zh");

    const jaFiles = ["ja.json", "nested.json"];
    const zhFiles = ["zh.json", "nested.json"];

    for (const file of jaFiles) {
      const expectedPath = join(expectedJaDir, file);
      const actualPath = join(actualJaDir, file);

      expect(readFileSync(actualPath, "utf-8")).toBeDefined();

      const expectedContent = JSON.parse(readFileSync(expectedPath, "utf-8"));
      const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));

      expect(actualContent).toEqual(expectedContent);
    }

    for (const file of zhFiles) {
      const expectedPath = join(expectedZhDir, file);
      const actualPath = join(actualZhDir, file);

      expect(readFileSync(actualPath, "utf-8")).toBeDefined();

      const expectedContent = JSON.parse(readFileSync(expectedPath, "utf-8"));
      const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));

      expect(actualContent).toEqual(expectedContent);
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

    const actualJaPath = join(testLocalesDir, "ja", "nested.json");
    const actualJaContent = JSON.parse(readFileSync(actualJaPath, "utf-8"));

    expect(actualJaContent.user.profile.age).toBe("30");
    expect(actualJaContent.user.profile.active).toBe("true");
    expect(actualJaContent.items).toBe("null");
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

    const actualJaPath = join(testLocalesDir, "ja", "ja.json");
    const actualZhPath = join(testLocalesDir, "zh", "zh.json");

    const actualJaContent = JSON.parse(readFileSync(actualJaPath, "utf-8"));
    const actualZhContent = JSON.parse(readFileSync(actualZhPath, "utf-8"));

    expect(actualJaContent.hello).toBe("Hello {name}");
    expect(actualJaContent.items_count).toBe("{count} items");
    expect(actualZhContent.hello).toBe("Hello {name}");
    expect(actualZhContent.items_count).toBe("{count} items");
  });
});
