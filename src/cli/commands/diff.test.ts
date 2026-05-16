import { Command } from "commander";
import { describe, expect, test, vi, beforeEach, afterEach, MockInstance } from "vitest";
import { executeDiff, DiffOptions, diffCommand } from "./diff";

describe("executeDiff", () => {
  let consoleLogSpy: MockInstance;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("should log usage example when source is missing", () => {
    const options: DiffOptions = {
      format: "text",
      target: "./locales/zh.json",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nUsage example:");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "  i18n-agent diff -s ./src/locales/en.json -t ./src/locales/zh.json",
    );
  });

  test("should log usage example when target is missing", () => {
    const options: DiffOptions = {
      format: "text",
      source: "./locales/en.json",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nUsage example:");
  });

  test("should log usage example when both source and target are missing", () => {
    const options: DiffOptions = {
      format: "text",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nUsage example:");
  });

  test("should log comparison info when source and target are provided", () => {
    const options: DiffOptions = {
      format: "json",
      source: "./locales/en.json",
      target: "./locales/zh.json",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nComparing:");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Source: ./locales/en.json");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Target: ./locales/zh.json");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Format: json");
  });

  test("should log output path when output option is provided", () => {
    const options: DiffOptions = {
      format: "json",
      output: "./result.json",
      source: "./locales/en.json",
      target: "./locales/zh.json",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nComparing:");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Source: ./locales/en.json");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Target: ./locales/zh.json");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Format: json");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Output: ./result.json");
  });

  test("should use default format when not specified", () => {
    const options: DiffOptions = {
      source: "./locales/en.json",
      target: "./locales/zh.json",
    };

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("  Format: undefined");
  });

  test("should handle empty options object", () => {
    const options: DiffOptions = {};

    executeDiff(options);

    expect(consoleLogSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleLogSpy).toHaveBeenCalledWith("Options:", options);
    expect(consoleLogSpy).toHaveBeenCalledWith("\nUsage example:");
  });
});

describe("diffCommand", () => {
  test("should register diff command to program", () => {
    const program = new Command();
    diffCommand(program);

    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain("diff");
  });

  test("should have correct command description", () => {
    const program = new Command();
    diffCommand(program);

    const diffCmd = program.commands.find((cmd) => cmd.name() === "diff");
    expect(diffCmd?.description()).toBe("Compare and analyze i18n differences");
  });

  test("should have all required options", () => {
    const program = new Command();
    diffCommand(program);

    const diffCmd = program.commands.find((cmd) => cmd.name() === "diff");
    const options = diffCmd?.options.map((opt) => opt.long) || [];

    expect(options).toContain("--source");
    expect(options).toContain("--target");
    expect(options).toContain("--format");
    expect(options).toContain("--output");
  });

  test("should execute action when command is parsed", () => {
    const program = new Command();
    diffCommand(program);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    program.parse(["node", "test", "diff", "-s", "./en.json", "-t", "./zh.json"]);

    expect(consoleSpy).toHaveBeenCalledWith("i18n-agent diff command executed");
    expect(consoleSpy).toHaveBeenCalledWith("\nComparing:");

    consoleSpy.mockRestore();
  });
});
