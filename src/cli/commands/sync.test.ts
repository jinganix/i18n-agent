import { Command } from "commander";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeSync, syncCommand } from "./sync.js";

vi.mock("@/graph/index.js", () => ({
  syncWorkflow: vi.fn(() => Promise.resolve()),
}));

describe("commands/sync", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should execute sync command with valid config file", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await executeSync({ config: "tests/fixture/i18n-agent.config.json" });

    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it("should show error when config file is not provided", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const logSpy = vi.spyOn(console, "log");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await executeSync({});

    expect(errorSpy).toHaveBeenCalledWith("Error: Config file is required");
    expect(logSpy).toHaveBeenCalledWith("\nUsage: i18n-agent sync -c <config.json>");
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should register sync command to program", async () => {
    const program = new Command();
    let capturedAction:
      | ((options: { config?: string; source?: string }) => Promise<void>)
      | undefined;

    const commandMock = {
      action: (fn: (options: { config?: string; source?: string }) => Promise<void>) => {
        capturedAction = fn;
        return commandMock;
      },
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
    };

    vi.spyOn(program, "command").mockReturnValue(
      commandMock as unknown as ReturnType<typeof program.command>,
    );

    syncCommand(program);

    expect(program.command).toHaveBeenCalledWith("sync");
    expect(commandMock.description).toHaveBeenCalledWith("Sync i18n files based on configuration");
    expect(commandMock.option).toHaveBeenCalledWith(
      "-c, --config <path>",
      "Configuration file path",
    );
    expect(commandMock.option).toHaveBeenCalledWith(
      "-s, --source <path>",
      "Source file or directory path (relative to source locale)",
    );
    expect(capturedAction).toBeDefined();

    if (capturedAction) {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
      await capturedAction({});
      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    }

    vi.restoreAllMocks();
  });

  it("should handle sync workflow error", async () => {
    const { syncWorkflow } = await import("@/graph/index.js");
    const mockError = new Error("Translation API failed");
    vi.mocked(syncWorkflow).mockRejectedValueOnce(mockError);

    await executeSync({ config: "tests/fixture/i18n-agent.config.json" });

    expect(errorSpy).toHaveBeenCalledWith("Error: Translation API failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should execute sync with source parameter", async () => {
    const { syncWorkflow } = await import("@/graph/index.js");

    await executeSync({
      config: "tests/fixture/i18n-agent.config.json",
      source: "messages.json",
    });

    expect(syncWorkflow).toHaveBeenCalledWith(
      "tests/fixture/i18n-agent.config.json",
      "messages.json",
      undefined,
      undefined,
      undefined,
    );
  });

  it("should execute sync with dry-run option", async () => {
    const { syncWorkflow } = await import("@/graph/index.js");

    await executeSync({
      config: "tests/fixture/i18n-agent.config.json",
      dryRun: true,
    });

    expect(syncWorkflow).toHaveBeenCalledWith(
      "tests/fixture/i18n-agent.config.json",
      undefined,
      true,
      undefined,
      undefined,
    );
  });

  it("should execute sync with all options", async () => {
    const { syncWorkflow } = await import("@/graph/index.js");

    await executeSync({
      config: "tests/fixture/i18n-agent.config.json",
      dryRun: true,
      source: "nested.json",
    });

    expect(syncWorkflow).toHaveBeenCalledWith(
      "tests/fixture/i18n-agent.config.json",
      "nested.json",
      true,
      undefined,
      undefined,
    );
  });
});
