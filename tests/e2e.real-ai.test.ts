import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { syncWorkflow } from "@/graph/index.js";

describe("E2E - Real AI Translation", () => {
  const projectRoot = process.cwd();
  const configPath = join(projectRoot, "i18n-agent.config.json");
  const outputDir = join(projectRoot, ".tmp/e2e-output");

  beforeAll(() => {
    if (!existsSync(configPath)) {
      console.log("Skipping E2E tests: i18n-agent.config.json not found");
    }
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(outputDir, { force: true, recursive: true });
  });

  it("should translate using real AI API when config exists", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfigPath = join(outputDir, "config.json");
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales"),
    };

    const testLocalesDir = join(outputDir, "test-locales");
    const testEnDir = join(testLocalesDir, "en-US");

    mkdirSync(testEnDir, { recursive: true });

    const fixtureDir = join(projectRoot, "tests/fixture");
    const enFiles = ["en-US.json", "nested.json"];
    for (const file of enFiles) {
      const sourcePath = join(fixtureDir, "locales", "en-US", file);
      const targetPath = join(testEnDir, file);
      if (existsSync(sourcePath)) {
        const content = readFileSync(sourcePath, "utf-8");
        writeFileSync(targetPath, content);
      }
    }

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const targetLocales = modifiedConfig.targetLocales || [];

    for (const locale of targetLocales) {
      const actualDir = join(testLocalesDir, locale);
      const files = [`${locale}.json`, "nested.json"];

      for (const file of files) {
        const actualPath = join(actualDir, file);

        if (existsSync(join(testEnDir, file))) {
          expect(existsSync(actualPath)).toBe(true);

          const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));
          expect(Object.keys(actualContent).length).toBeGreaterThan(0);

          for (const key of Object.keys(actualContent)) {
            expect(actualContent[key]).toBeDefined();
            const value = actualContent[key];
            if (typeof value === "object" && value !== null) {
              expect(Object.keys(value as object).length).toBeGreaterThan(0);
            } else {
              expect(typeof value).toBe("string");
              expect(String(value).length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  }, 60000);

  it("should handle nested JSON structure with real AI", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfigPath = join(outputDir, "config-nested.json");
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales-nested"),
    };

    const testLocalesDir = join(outputDir, "test-locales-nested");
    const testEnDir = join(testLocalesDir, "en-US");

    mkdirSync(testEnDir, { recursive: true });

    const fixtureDir = join(projectRoot, "tests/fixture");
    const sourcePath = join(fixtureDir, "locales", "en-US", "nested.json");
    const targetPath = join(testEnDir, "nested.json");

    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, "utf-8");
      writeFileSync(targetPath, content);
    }

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const targetLocales = modifiedConfig.targetLocales || [];

    for (const locale of targetLocales) {
      const actualPath = join(testLocalesDir, locale, "nested.json");

      if (existsSync(targetPath)) {
        expect(existsSync(actualPath)).toBe(true);

        const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));

        const sourceContent = JSON.parse(readFileSync(targetPath, "utf-8"));
        const sourceKeys = Object.keys(sourceContent);

        for (const key of sourceKeys) {
          expect(actualContent[key]).toBeDefined();
        }
      }
    }
  }, 60000);

  it("should preserve placeholders in translations", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfigPath = join(outputDir, "config-placeholders.json");
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "test-locales-placeholders"),
    };

    const testLocalesDir = join(outputDir, "test-locales-placeholders");
    const testEnDir = join(testLocalesDir, "en-US");

    mkdirSync(testEnDir, { recursive: true });

    const fixtureDir = join(projectRoot, "tests/fixture");
    const sourcePath = join(fixtureDir, "locales", "en-US", "en-US.json");
    const targetPath = join(testEnDir, "en-US.json");

    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, "utf-8");
      writeFileSync(targetPath, content);
    }

    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const targetLocales = modifiedConfig.targetLocales || [];

    for (const locale of targetLocales) {
      const actualPath = join(testLocalesDir, locale, `${locale}.json`);

      if (existsSync(targetPath)) {
        expect(existsSync(actualPath)).toBe(true);

        const sourceContent = JSON.parse(readFileSync(targetPath, "utf-8"));
        const actualContent = JSON.parse(readFileSync(actualPath, "utf-8"));

        const placeholderPattern = /\{[^}]+\}/g;

        for (const key of Object.keys(sourceContent)) {
          const sourceValue = String(sourceContent[key]);
          const actualValue = String(actualContent[key]);

          const sourcePlaceholders = sourceValue.match(placeholderPattern);

          if (sourcePlaceholders && sourcePlaceholders.length > 0) {
            expect(actualValue).toMatch(placeholderPattern);

            for (const placeholder of sourcePlaceholders) {
              const placeholderName = placeholder.match(/\{(\w+)/);
              if (placeholderName && placeholderName[1]) {
                expect(actualValue).toContain(placeholderName[1]);
              }
            }
          }
        }
      }
    }
  }, 60000);
});
