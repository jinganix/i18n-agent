import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { syncWorkflow } from "@/graph/index.js";

describe("E2E - Git Diff Workflow", () => {
  const projectRoot = process.cwd();
  const configPath = join(projectRoot, "i18n-agent.config.json");
  const e2eDir = join(projectRoot, ".tmp/e2e-git-diff");
  const gitRepoDir = join(e2eDir, "test-repo");
  const localesDir = join(gitRepoDir, "locales");

  beforeAll(() => {
    if (!existsSync(configPath)) {
      console.log("Skipping E2E Git Diff tests: i18n-agent.config.json not found");
      return;
    }

    mkdirSync(e2eDir, { recursive: true });

    if (existsSync(gitRepoDir)) {
      rmSync(gitRepoDir, { force: true, recursive: true });
    }

    mkdirSync(gitRepoDir, { recursive: true });

    try {
      execSync("git init", { cwd: gitRepoDir, stdio: "pipe" });
      execSync('git config user.email "test@example.com"', { cwd: gitRepoDir, stdio: "pipe" });
      execSync('git config user.name "Test User"', { cwd: gitRepoDir, stdio: "pipe" });
    } catch (error) {
      console.error("Failed to initialize git repo:", error);
      throw error;
    }
  });

  afterAll(() => {
    if (existsSync(e2eDir)) {
      rmSync(e2eDir, { force: true, recursive: true });
    }
  });

  const runGitCommand = (command: string): void => {
    try {
      execSync(command, { cwd: gitRepoDir, stdio: "pipe" });
    } catch (error) {
      console.error(`Git command failed: ${command}`, error);
      throw error;
    }
  };

  const createConfigFile = (mode: "diff" | "full" = "diff"): string => {
    const originalConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    const testConfig = {
      ...originalConfig,
      localesDir: localesDir,
      mode: mode,
    };

    const configFilePath = join(gitRepoDir, "i18n-agent.config.json");
    writeFileSync(configFilePath, JSON.stringify(testConfig, null, 2));
    return configFilePath;
  };

  const createInitialTranslationFiles = (): void => {
    mkdirSync(join(localesDir, "en-US"), { recursive: true });

    const enContent = {
      goodbye: "Goodbye",
      hello: "Hello World",
      items_count: "{count} items",
      user_greeting: "Hello, {name}!",
      welcome: "Welcome to our application",
    };

    writeFileSync(join(localesDir, "en-US", "en-US.json"), JSON.stringify(enContent, null, 2));

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      mkdirSync(join(localesDir, locale), { recursive: true });
      const initialContent = {
        goodbye: "",
        hello: "",
        items_count: "",
        user_greeting: "",
        welcome: "",
      };
      writeFileSync(
        join(localesDir, locale, `${locale}.json`),
        JSON.stringify(initialContent, null, 2),
      );
    }

    runGitCommand("git add .");
    runGitCommand('git commit -m "Initial translation files"');
  };

  it("should detect and translate only new keys in diff mode", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    createInitialTranslationFiles();

    const enFilePath = join(localesDir, "en-US", "en-US.json");
    const enContent = JSON.parse(readFileSync(enFilePath, "utf-8"));

    const updatedEnContent = {
      ...enContent,
      nested: {
        level1: {
          level2: "Deep nested new key",
        },
      },
      new_key_1: "This is a new key",
      new_key_2: "Another new key added",
    };

    writeFileSync(enFilePath, JSON.stringify(updatedEnContent, null, 2));

    runGitCommand("git add .");
    runGitCommand('git commit -m "Add new translation keys"');

    const configFilePath = createConfigFile("diff");
    await syncWorkflow(configFilePath);

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      const localeFilePath = join(localesDir, locale, `${locale}.json`);
      expect(existsSync(localeFilePath)).toBe(true);

      const translatedContent = JSON.parse(readFileSync(localeFilePath, "utf-8"));

      expect(translatedContent.hello).toBeDefined();
      expect(translatedContent.welcome).toBeDefined();

      expect(translatedContent.new_key_1).toBeDefined();
      expect(translatedContent.new_key_1.length).toBeGreaterThan(0);
      expect(typeof translatedContent.new_key_1).toBe("string");

      expect(translatedContent.new_key_2).toBeDefined();
      expect(translatedContent.new_key_2.length).toBeGreaterThan(0);

      expect(translatedContent.nested).toBeDefined();
      expect(typeof translatedContent.nested).toBe("object");
      expect(translatedContent.nested.level1).toBeDefined();
      expect(translatedContent.nested.level1.level2).toBeDefined();
      expect(translatedContent.nested.level1.level2.length).toBeGreaterThan(0);
    }
  }, 60000);

  it("should handle modified existing keys in diff mode", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const enFilePath = join(localesDir, "en-US", "en-US.json");
    const currentContent = JSON.parse(readFileSync(enFilePath, "utf-8"));

    const modifiedContent = {
      ...currentContent,
      hello: "Hello World - Updated",
      welcome: "Welcome to our updated application",
    };

    writeFileSync(enFilePath, JSON.stringify(modifiedContent, null, 2));

    runGitCommand("git add .");
    runGitCommand('git commit -m "Modify existing translation keys"');

    const configFilePath = createConfigFile("diff");
    await syncWorkflow(configFilePath);

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      const localeFilePath = join(localesDir, locale, `${locale}.json`);
      const translatedContent = JSON.parse(readFileSync(localeFilePath, "utf-8"));

      expect(translatedContent.hello).toBeDefined();
      expect(translatedContent.welcome).toBeDefined();

      expect(translatedContent.new_key_1).toBeDefined();
      expect(translatedContent.new_key_2).toBeDefined();
    }
  }, 60000);

  it("should preserve existing translations when adding new keys", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const zhFilePath = join(localesDir, "zh-CN", "zh-CN.json");
    const zhContentBefore = JSON.parse(readFileSync(zhFilePath, "utf-8"));

    const enFilePath = join(localesDir, "en-US", "en-US.json");
    const enContent = JSON.parse(readFileSync(enFilePath, "utf-8"));

    const updatedEnContent = {
      ...enContent,
      brand_new_key: "Brand new translation needed",
    };

    writeFileSync(enFilePath, JSON.stringify(updatedEnContent, null, 2));

    runGitCommand("git add .");
    runGitCommand('git commit -m "Add brand new key"');

    const configFilePath = createConfigFile("diff");
    await syncWorkflow(configFilePath);

    const zhContentAfter = JSON.parse(readFileSync(zhFilePath, "utf-8"));

    expect(zhContentAfter.hello).toBe(zhContentBefore.hello);
    expect(zhContentAfter.welcome).toBe(zhContentBefore.welcome);

    expect(zhContentAfter.brand_new_key).toBeDefined();
    expect(zhContentAfter.brand_new_key.length).toBeGreaterThan(0);
  }, 60000);

  it("should handle file deletion and addition in diff mode", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const nestedDir = join(localesDir, "en-US");
    const nestedFilePath = join(nestedDir, "nested.json");

    const nestedContent = {
      section1: {
        description: "Section 1 Description",
        title: "Section 1 Title",
      },
      section2: {
        title: "Section 2 Title",
      },
    };

    writeFileSync(nestedFilePath, JSON.stringify(nestedContent, null, 2));

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      const localeNestedPath = join(localesDir, locale, "nested.json");
      const emptyNested = {
        section1: {
          description: "",
          title: "",
        },
        section2: {
          title: "",
        },
      };
      writeFileSync(localeNestedPath, JSON.stringify(emptyNested, null, 2));
    }

    runGitCommand("git add .");
    runGitCommand('git commit -m "Add nested translation file"');

    const updatedNestedContent = {
      section1: {
        description: "Section 1 Description",
        title: "Section 1 Title - Updated",
      },
      section2: {
        subtitle: "New Subtitle Added",
        title: "Section 2 Title - Updated",
      },
      section3: {
        title: "Completely New Section",
      },
    };

    writeFileSync(nestedFilePath, JSON.stringify(updatedNestedContent, null, 2));

    runGitCommand("git add .");
    runGitCommand('git commit -m "Update nested file with changes"');

    const configFilePath = createConfigFile("diff");
    await syncWorkflow(configFilePath);

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      const localeNestedPath = join(localesDir, locale, "nested.json");
      expect(existsSync(localeNestedPath)).toBe(true);

      const translatedNested = JSON.parse(readFileSync(localeNestedPath, "utf-8"));

      expect(translatedNested.section1.title).toBeDefined();

      expect(translatedNested.section1.description).toBeDefined();

      expect(translatedNested.section2.title).toBeDefined();

      expect(translatedNested.section2.subtitle).toBeDefined();
      expect(translatedNested.section2.subtitle.length).toBeGreaterThan(0);

      expect(translatedNested.section3).toBeDefined();
      expect(translatedNested.section3.title).toBeDefined();
      expect(translatedNested.section3.title.length).toBeGreaterThan(0);
    }
  }, 60000);

  it("should handle multiple commits with incremental changes", async () => {
    if (!existsSync(configPath)) {
      console.log("Skipping test: i18n-agent.config.json not found");
      return;
    }

    const enFilePath = join(localesDir, "en-US", "en-US.json");

    const content1 = JSON.parse(readFileSync(enFilePath, "utf-8"));
    const updated1 = {
      ...content1,
      commit_1_key: "Added in commit 1",
    };
    writeFileSync(enFilePath, JSON.stringify(updated1, null, 2));
    runGitCommand("git add .");
    runGitCommand('git commit -m "Commit 1: Add first key"');

    await syncWorkflow(createConfigFile("diff"));

    const content2 = {
      ...updated1,
      commit_2_key: "Added in commit 2",
    };
    writeFileSync(enFilePath, JSON.stringify(content2, null, 2));
    runGitCommand("git add .");
    runGitCommand('git commit -m "Commit 2: Add second key"');

    await syncWorkflow(createConfigFile("diff"));

    for (const locale of ["zh-CN", "ru-RU", "fr-FR", "ar-SA"]) {
      const localeFilePath = join(localesDir, locale, `${locale}.json`);
      const finalContent = JSON.parse(readFileSync(localeFilePath, "utf-8"));

      expect(finalContent.commit_1_key).toBeDefined();
      expect(finalContent.commit_1_key.length).toBeGreaterThan(0);

      expect(finalContent.commit_2_key).toBeDefined();
      expect(finalContent.commit_2_key.length).toBeGreaterThan(0);
    }
  }, 90000);
});
