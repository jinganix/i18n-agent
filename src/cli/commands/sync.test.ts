import { Command } from "commander";
import { describe, it, expect, vi } from "vitest";
import { executeSync, syncCommand } from "./sync.js";

vi.mock("@/graph/index.js", () => ({
  syncWorkflow: vi.fn(() => Promise.resolve()),
}));

describe("commands/sync", () => {
  it("should execute sync command with valid config file", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await executeSync({ config: "tests/i18n-agent.config.json" });

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
});
