import { execSync } from "child_process";
import { resolve } from "path";
import { describe, expect, test, vi } from "vitest";
import { createProgram, runCLI, isMain, executeIfMainModule } from "./index";

const cliPath = resolve(__dirname, "../../src/cli/index.ts");
const cliEntryPath = resolve(__dirname, "./index.ts");
const cliIndexPath = resolve(__dirname, "./index.ts");

describe("createProgram", () => {
  test("should create a program with correct name", () => {
    const program = createProgram();
    expect(program.name()).toBe("i18n-agent");
  });

  test("should create a program with correct description", () => {
    const program = createProgram();
    expect(program.description()).toBe("i18n agent CLI tool");
  });

  test("should create a program with version", () => {
    const program = createProgram();
    expect(program.version()).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should have sync command registered", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("sync");
  });
});

describe("runCLI", () => {
  test("should run CLI with provided arguments", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    runCLI(["node", "test", "sync", "-c", "./test-config.json"]);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(exitSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("should run CLI with help command", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);

    expect(() => runCLI(["node", "test", "--help"])).not.toThrow();

    exitSpy.mockRestore();
  });
});

describe("isMain", () => {
  test("should return true when metaUrl matches argvPath", () => {
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/test/path/index.ts";

    expect(isMain(metaUrl, argvPath)).toBe(true);
  });

  test("should return false when metaUrl does not match argvPath", () => {
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/different/path/index.ts";

    expect(isMain(metaUrl, argvPath)).toBe(false);
  });

  test("should handle different file protocols", () => {
    expect(isMain("file:///path/to/file.ts", "/path/to/file.ts")).toBe(true);
    expect(isMain("file:///path/to/file.ts", "/different/path.ts")).toBe(false);
  });
});

describe("executeIfMainModule", () => {
  test("should verify isMain logic works correctly", () => {
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/test/path/index.ts";

    expect(isMain(metaUrl, argvPath)).toBe(true);

    expect(isMain(metaUrl, "/different/path.ts")).toBe(false);
  });

  test("should not call runCLI when isMain returns false", () => {
    const originalArgv = process.argv;
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/different/path/other.ts";
    process.argv = ["node", argvPath];

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(isMain(metaUrl, argvPath)).toBe(false);

    executeIfMainModule();

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.argv = originalArgv;
  });
});

describe("CLI Integration Tests", () => {
  test("should show help message", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliPath} --help`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toContain("i18n agent CLI tool");
    expect(output).toContain("sync");
  });

  test("should show sync command help", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliPath} sync --help`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toContain("Sync i18n files based on configuration");
    expect(output).toContain("--config");
  });
});

describe("CLI Entry Point", () => {
  test("should execute CLI when run directly", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliEntryPath} --version`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should parse arguments when executed directly", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliEntryPath} sync --help`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toContain("Sync i18n files based on configuration");
  });
});

describe("CLI Index Module Direct Execution", () => {
  test("should execute runCLI when module is run directly via tsx", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliIndexPath} --version`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should show help for sync command", () => {
    const output = execSync(`tsx -r tsconfig-paths/register ${cliIndexPath} sync --help`, {
      env: { ...process.env, NODE_ENV: undefined, VITEST: undefined },
    }).toString();
    expect(output).toContain("Sync i18n files based on configuration");
    expect(output).toContain("--config");
  });
});
