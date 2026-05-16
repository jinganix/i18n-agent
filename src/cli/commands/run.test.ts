import { Command } from "commander";
import { describe, it, expect, vi } from "vitest";
import { executeRun, runCommand } from "./run";

describe("commands/run", () => {
  it("should execute run command", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await executeRun();
    expect(consoleSpy).toHaveBeenCalledWith("hello world");
    consoleSpy.mockRestore();
  });

  it("should register run command to program", async () => {
    const program = new Command();
    let capturedAction: (() => Promise<void>) | undefined;

    const commandMock = {
      action: (fn: () => Promise<void>) => {
        capturedAction = fn;
        return commandMock;
      },
      description: vi.fn().mockReturnThis(),
    };

    vi.spyOn(program, "command").mockReturnValue(
      commandMock as unknown as ReturnType<typeof program.command>,
    );

    runCommand(program);

    expect(program.command).toHaveBeenCalledWith("run");
    expect(commandMock.description).toHaveBeenCalledWith("Start the i18n agent workflow");
    expect(capturedAction).toBeDefined();

    if (capturedAction) {
      const consoleSpy = vi.spyOn(console, "log");
      await capturedAction();
      expect(consoleSpy).toHaveBeenCalledWith("hello world");
      consoleSpy.mockRestore();
    }

    vi.restoreAllMocks();
  });
});
