import { Command } from "commander";
import { describe, it, expect, vi } from "vitest";
import { assistantCommand } from "./assistant.js";

vi.mock("./assistant.js", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    executeAssistant: vi.fn(() => Promise.resolve()),
  };
});

describe("commands/assistant", () => {
  it("should register ask command to program", () => {
    const program = new Command();
    let capturedAction:
      | ((message: string, options: { config?: string; message?: string }) => Promise<void>)
      | undefined;

    const commandMock = {
      action: (
        fn: (message: string, options: { config?: string; message?: string }) => Promise<void>,
      ) => {
        capturedAction = fn;
        return commandMock;
      },
      argument: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
    };

    vi.spyOn(program, "command").mockReturnValue(
      commandMock as unknown as ReturnType<typeof program.command>,
    );

    assistantCommand(program);

    expect(program.command).toHaveBeenCalledWith("ask");
    expect(commandMock.description).toHaveBeenCalledWith(
      "Ask AI assistant to help with i18n tasks using natural language",
    );
    expect(commandMock.argument).toHaveBeenCalledWith(
      "[message]",
      "Natural language message describing what you want to do",
    );
    expect(commandMock.option).toHaveBeenCalledWith(
      "-c, --config <path>",
      "Configuration file path",
    );
    expect(capturedAction).toBeDefined();
  });

  it("should show error when no message is provided", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const logSpy = vi.spyOn(console, "log");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    const commandMock = {
      action: (
        fn: (
          message: string | undefined,
          options: { config?: string; message?: string },
        ) => Promise<void>,
      ) => {
        return fn(undefined, {});
      },
      argument: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
    };

    const program = new Command();
    vi.spyOn(program, "command").mockReturnValue(
      commandMock as unknown as ReturnType<typeof program.command>,
    );

    assistantCommand(program);

    expect(errorSpy).toHaveBeenCalledWith("Error: Please provide a message");
    expect(logSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
