import { mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { syncWorkflow } from "@/graph/index.js";

vi.mock("@/utils/api.client.js", () => ({
  loadPrompt: vi.fn((locale) => {
    return `Translate to ${locale}`;
  }),
  getPromptForLocale: vi.fn((locale) => {
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
          if (typeof value === "string") {
            translatedData[key.prefixedKey] = `[${task.locale}] ${value}`;
          } else if (value === null) {
            translatedData[key.prefixedKey] = "";
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

  it("should translate and sync files with correct structure", async () => {
    const modifiedConfigPath = join(outputDir, "config.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "fixture-locales"),
    };

    const { writeFileSync, cpSync } = await import("fs");
    cpSync(join(fixtureDir, "locales"), join(outputDir, "fixture-locales"), {
      recursive: true,
    });
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const jaEnPath = join(outputDir, "fixture-locales", "ja", "ja.json");
    const zhEnPath = join(outputDir, "fixture-locales", "zh", "zh.json");
    const jaNestedPath = join(outputDir, "fixture-locales", "ja", "nested.json");
    const zhNestedPath = join(outputDir, "fixture-locales", "zh", "nested.json");

    expect(readFileSync(jaEnPath, "utf-8")).toBeDefined();
    expect(readFileSync(zhEnPath, "utf-8")).toBeDefined();
    expect(readFileSync(jaNestedPath, "utf-8")).toBeDefined();
    expect(readFileSync(zhNestedPath, "utf-8")).toBeDefined();

    const jaEnContent = JSON.parse(readFileSync(jaEnPath, "utf-8"));
    const zhEnContent = JSON.parse(readFileSync(zhEnPath, "utf-8"));
    const jaNestedContent = JSON.parse(readFileSync(jaNestedPath, "utf-8"));
    const zhNestedContent = JSON.parse(readFileSync(zhNestedPath, "utf-8"));

    expect(jaEnContent).toHaveProperty("welcome");
    expect(jaEnContent).toHaveProperty("goodbye");
    expect(jaEnContent).toHaveProperty("hello");
    expect(jaEnContent).toHaveProperty("items_count");

    expect(zhEnContent).toHaveProperty("welcome");
    expect(zhEnContent).toHaveProperty("goodbye");
    expect(zhEnContent).toHaveProperty("hello");
    expect(zhEnContent).toHaveProperty("items_count");

    expect(jaEnContent.welcome).toBe("[ja] Welcome");
    expect(jaEnContent.goodbye).toBe("[ja] Goodbye");
    expect(zhEnContent.welcome).toBe("[zh] Welcome");
    expect(zhEnContent.goodbye).toBe("[zh] Goodbye");

    expect(jaNestedContent).toHaveProperty("welcome");
    expect(jaNestedContent).toHaveProperty("user");
    expect(jaNestedContent.user).toHaveProperty("name");
    expect(jaNestedContent.user).toHaveProperty("profile");
    expect(jaNestedContent.user.profile).toHaveProperty("age");
    expect(jaNestedContent.user.profile).toHaveProperty("active");
    expect(jaNestedContent).toHaveProperty("items");

    expect(zhNestedContent).toHaveProperty("welcome");
    expect(zhNestedContent).toHaveProperty("user");
    expect(zhNestedContent.user).toHaveProperty("name");
    expect(zhNestedContent.user).toHaveProperty("profile");
    expect(zhNestedContent.user.profile).toHaveProperty("age");
    expect(zhNestedContent.user.profile).toHaveProperty("active");
    expect(zhNestedContent).toHaveProperty("items");

    expect(jaNestedContent.welcome).toBe("[ja] Welcome");
    expect(jaNestedContent.user.name).toBe("[ja] John");
    expect(jaNestedContent.user.profile.age).toBe("30");
    expect(jaNestedContent.user.profile.active).toBe("true");

    expect(zhNestedContent.welcome).toBe("[zh] Welcome");
    expect(zhNestedContent.user.name).toBe("[zh] John");
    expect(zhNestedContent.user.profile.age).toBe("30");
    expect(zhNestedContent.user.profile.active).toBe("true");
  });

  it("should preserve nested structure correctly", async () => {
    const modifiedConfigPath = join(outputDir, "config2.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "fixture-locales2"),
    };

    const { writeFileSync, cpSync } = await import("fs");
    cpSync(join(fixtureDir, "locales"), join(outputDir, "fixture-locales2"), {
      recursive: true,
    });
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const jaNestedPath = join(outputDir, "fixture-locales2", "ja", "nested.json");
    const jaNestedContent = JSON.parse(readFileSync(jaNestedPath, "utf-8"));

    expect(jaNestedContent.user).toBeDefined();
    expect(typeof jaNestedContent.user).toBe("object");
    expect(jaNestedContent.user.profile).toBeDefined();
    expect(typeof jaNestedContent.user.profile).toBe("object");
    expect(jaNestedContent.user.profile.age).toBeDefined();
    expect(jaNestedContent.user.profile.active).toBeDefined();
  });

  it("should create files for all target locales", async () => {
    const modifiedConfigPath = join(outputDir, "config3.json");
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const modifiedConfig = {
      ...originalConfig,
      localesDir: join(outputDir, "fixture-locales3"),
    };

    const { writeFileSync, cpSync } = await import("fs");
    cpSync(join(fixtureDir, "locales"), join(outputDir, "fixture-locales3"), {
      recursive: true,
    });
    writeFileSync(modifiedConfigPath, JSON.stringify(modifiedConfig, null, 2));

    await syncWorkflow(modifiedConfigPath);

    const { readdirSync } = await import("fs");
    const jaDir = join(outputDir, "fixture-locales3", "ja");
    const zhDir = join(outputDir, "fixture-locales3", "zh");

    const jaFiles = readdirSync(jaDir);
    const zhFiles = readdirSync(zhDir);

    expect(jaFiles).toContain("ja.json");
    expect(jaFiles).toContain("nested.json");
    expect(zhFiles).toContain("zh.json");
    expect(zhFiles).toContain("nested.json");
  });
});
