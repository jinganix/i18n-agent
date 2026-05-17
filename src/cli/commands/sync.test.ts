import { Command } from "commander";
import { readFileSync } from "fs";
import { describe, it, expect, vi } from "vitest";
import { executeSync, syncCommand } from "./sync.js";

const mockReadFileSync = vi.mocked(readFileSync);

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

describe("commands/sync", () => {
  it("should execute sync command with valid JSON file", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const mockContent = '{"user": {"name": "John"}}';
    mockReadFileSync.mockReturnValue(mockContent);

    await executeSync({ source: "tests/locales/en/en.json" });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should show error when source file is not provided", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const logSpy = vi.spyOn(console, "log");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await executeSync({});

    expect(errorSpy).toHaveBeenCalledWith("Error: Source file is required");
    expect(logSpy).toHaveBeenCalledWith("\nUsage: i18n-agent sync -s <source.json>");
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should show error when JSON is invalid", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockReadFileSync.mockReturnValue("invalid json");

    await executeSync({ source: "test.json" });

    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should show error when file read fails", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("File not found");
    });

    await executeSync({ source: "nonexistent.json" });

    expect(errorSpy).toHaveBeenCalledWith("Error: File not found");
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should register sync command to program", async () => {
    const program = new Command();
    let capturedAction: ((options: { source?: string }) => Promise<void>) | undefined;

    const commandMock = {
      action: (fn: (options: { source?: string }) => Promise<void>) => {
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
    expect(commandMock.description).toHaveBeenCalledWith(
      "Normalize i18n JSON keys to flat dot notation",
    );
    expect(commandMock.option).toHaveBeenCalledWith("-s, --source <path>", "Source JSON file path");
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
