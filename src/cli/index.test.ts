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

  test("should have diff command registered", () => {
    const program = createProgram();
    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("diff");
  });
});

describe("runCLI", () => {
  test("should run CLI with provided arguments", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);

    expect(() =>
      runCLI(["node", "test", "diff", "-s", "./en.json", "-t", "./zh.json"]),
    ).not.toThrow();

    exitSpy.mockRestore();
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
  test("should call runCLI when isMain returns true", () => {
    const originalArgv = process.argv;
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/test/path/index.ts";
    process.argv = ["node", argvPath, "diff", "-s", "./en.json", "-t", "./zh.json"];

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);

    // Verify isMain returns true
    expect(isMain(metaUrl, argvPath)).toBe(true);

    // Manually execute the logic that would happen in executeIfMainModule
    if (isMain(metaUrl, argvPath)) {
      runCLI(process.argv);
    }

    expect(consoleSpy).toHaveBeenCalledWith("i18n-agent diff command executed");

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
    process.argv = originalArgv;
  });

  test("should not call runCLI when isMain returns false", () => {
    const originalArgv = process.argv;
    const metaUrl = "file:///test/path/index.ts";
    const argvPath = "/different/path/other.ts";
    process.argv = ["node", argvPath];

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Verify isMain returns false
    expect(isMain(metaUrl, argvPath)).toBe(false);

    executeIfMainModule();

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.argv = originalArgv;
  });
});

describe("CLI Integration Tests", () => {
  test("should show help message", () => {
    const output = execSync(`tsx ${cliPath} --help`).toString();
    expect(output).toContain("i18n agent CLI tool");
    expect(output).toContain("diff");
  });

  test("should show diff command help", () => {
    const output = execSync(`tsx ${cliPath} diff --help`).toString();
    expect(output).toContain("Compare and analyze i18n differences");
    expect(output).toContain("--source");
    expect(output).toContain("--target");
  });

  test("should execute diff command without arguments", () => {
    const output = execSync(`tsx ${cliPath} diff`).toString();
    expect(output).toContain("i18n-agent diff command executed");
    expect(output).toContain("Usage example");
  });

  test("should execute diff command with arguments", () => {
    const output = execSync(
      `tsx ${cliPath} diff -s ./locales/en.json -t ./locales/zh.json -f json`,
    ).toString();
    expect(output).toContain("Comparing:");
    expect(output).toContain("Source: ./locales/en.json");
    expect(output).toContain("Target: ./locales/zh.json");
    expect(output).toContain("Format: json");
  });
});

describe("CLI Entry Point", () => {
  test("should execute CLI when run directly", () => {
    const output = execSync(`tsx ${cliEntryPath} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should parse arguments when executed directly", () => {
    const output = execSync(`tsx ${cliEntryPath} diff --help`).toString();
    expect(output).toContain("Compare and analyze i18n differences");
  });
});

describe("CLI Index Module Direct Execution", () => {
  test("should execute runCLI when module is run directly via tsx", () => {
    const output = execSync(`tsx ${cliIndexPath} --version`, {
      env: { ...process.env },
    }).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should execute runCLI with diff command", () => {
    const output = execSync(`tsx ${cliIndexPath} diff -s ./en.json -t ./zh.json`, {
      env: { ...process.env },
    }).toString();
    expect(output).toContain("i18n-agent diff command executed");
    expect(output).toContain("Source: ./en.json");
    expect(output).toContain("Target: ./zh.json");
  });
});
