import { Command } from "commander";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assistantCommand, executeAssistant } from "./assistant.js";

vi.mock("../../utils/api.client.js", () => ({
  callTranslationApi: vi.fn(),
}));

vi.mock("../utils/tool.executor.js", () => ({
  executeToolCall: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe("commands/assistant", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
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
    const program = new Command();
    let capturedAction:
      | ((
          message: string | undefined,
          options: { config?: string; message?: string },
        ) => Promise<void>)
      | undefined;

    const commandMock = {
      action: (
        fn: (
          message: string | undefined,
          options: { config?: string; message?: string },
        ) => Promise<void>,
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

    // Call the action with undefined message
    await capturedAction!(undefined, {});

    expect(errorSpy).toHaveBeenCalledWith("Error: Please provide a message");
    expect(logSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle missing API configuration file", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    await executeAssistant("test message", "nonexistent.json");

    expect(errorSpy).toHaveBeenCalledWith("Error: Could not load API configuration");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle config file without API section", async () => {
    const { readFileSync } = await import("fs");
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ localesDir: "./locales" }));

    await executeAssistant("test message", "config.json");

    expect(errorSpy).toHaveBeenCalledWith("Error: Could not load API configuration");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should use default config path when not provided", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockResolvedValue(
      JSON.stringify({
        explanation: "Cannot proceed",
        parameters: {},
        tool: null,
      }),
    );

    await executeAssistant("test message");

    expect(readFileSync).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle invalid JSON response from AI", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockResolvedValue("invalid json response");

    await executeAssistant("test message");

    expect(errorSpy).toHaveBeenCalledWith("Error: AI response is not valid JSON");
    expect(logSpy).toHaveBeenCalledWith("AI Response:", "invalid json response");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle tool execution failure", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");
    const { executeToolCall } = await import("../utils/tool.executor.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockResolvedValue(
      JSON.stringify({
        explanation: "Syncing files",
        parameters: { source: "test.json" },
        tool: "sync",
      }),
    );

    vi.mocked(executeToolCall).mockResolvedValue({
      message: "Tool execution failed",
      success: false,
    });

    await executeAssistant("test message");

    expect(errorSpy).toHaveBeenCalledWith("\n❌ Failed: Tool execution failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle outer catch block error", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockRejectedValue(new Error("API call failed"));

    await executeAssistant("test message");

    expect(errorSpy).toHaveBeenCalledWith("Error: API call failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle successful tool execution with data", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");
    const { executeToolCall } = await import("../utils/tool.executor.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockResolvedValue(
      JSON.stringify({
        explanation: "Syncing files",
        parameters: { source: "test.json" },
        tool: "sync",
      }),
    );

    vi.mocked(executeToolCall).mockResolvedValue({
      data: { syncedFiles: 2 },
      message: "Sync completed",
      success: true,
    });

    await executeAssistant("test message");

    expect(logSpy).toHaveBeenCalledWith("\n✅ Success: Sync completed");
    expect(logSpy).toHaveBeenCalledWith("📊 Result:", JSON.stringify({ syncedFiles: 2 }, null, 2));
  });

  it("should handle successful tool execution without data", async () => {
    const { readFileSync } = await import("fs");
    const { callTranslationApi } = await import("../../utils/api.client.js");
    const { executeToolCall } = await import("../utils/tool.executor.js");

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        api: {
          apiKey: "test-key",
          baseUrl: "https://api.test.com",
        },
      }),
    );

    vi.mocked(callTranslationApi).mockResolvedValue(
      JSON.stringify({
        explanation: "Running diff",
        parameters: { source: "en.json", target: "zh.json" },
        tool: "diff",
      }),
    );

    vi.mocked(executeToolCall).mockResolvedValue({
      message: "Diff completed",
      success: true,
    });

    await executeAssistant("test message");

    expect(logSpy).toHaveBeenCalledWith("\n✅ Success: Diff completed");
    // Should not log result data since there is none
    expect(logSpy).not.toHaveBeenCalledWith("📊 Result:", expect.any(String));
  });

  it("should use message from options when positional message is undefined", async () => {
    const program = new Command();
    let capturedAction:
      | ((
          message: string | undefined,
          options: { config?: string; message?: string },
        ) => Promise<void>)
      | undefined;

    const commandMock = {
      action: (
        fn: (
          message: string | undefined,
          options: { config?: string; message?: string },
        ) => Promise<void>,
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

    // Call with undefined positional message but message in options
    await capturedAction!(undefined, { message: "test from options" });

    // Should not exit since we have a message
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
