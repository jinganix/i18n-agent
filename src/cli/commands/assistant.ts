import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve } from "path";
import { executeToolCall } from "../utils/tool.executor.js";
import type { ApiConfig } from "@/graph/nodes/load.config.js";
import { callTranslationApi } from "@/utils/api.client.js";

export interface AssistantOptions {
  config?: string;
  message?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const AVAILABLE_TOOLS: Tool[] = [
  {
    description:
      "Sync i18n translation files based on configuration. Translates source locale files to target locales defined in config.",
    name: "sync",
    parameters: {
      properties: {
        config: {
          description: "Path to the configuration file (required)",
          type: "string",
        },
        dryRun: {
          description: "Preview changes without calling AI translation API (true/false)",
          type: "boolean",
        },
        source: {
          description:
            "Source file or directory path relative to source locale (optional, syncs all if not specified)",
          type: "string",
        },
      },
      required: ["config"],
      type: "object",
    },
  },
  {
    description: "Compare and analyze differences between i18n files",
    name: "diff",
    parameters: {
      properties: {
        format: {
          description: "Output format (json, text, table)",
          enum: ["json", "text", "table"],
          type: "string",
        },
        source: {
          description: "Source locale file path",
          type: "string",
        },
        target: {
          description: "Target locale file path",
          type: "string",
        },
      },
      required: ["source", "target"],
      type: "object",
    },
  },
];

const SYSTEM_PROMPT = `You are an i18n (internationalization) assistant that helps users manage translation tasks.

Available tools you can use:
${AVAILABLE_TOOLS.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}

When a user asks you to do something:
1. Understand their intent
2. Choose the most appropriate tool
3. Extract the required parameters from their message
4. If the user specified a config file via command line, you don't need to include it in parameters
5. Respond with a JSON object containing:
   - "tool": the tool name to use
   - "parameters": the parameters for that tool (config is optional if provided via CLI)
   - "explanation": brief explanation of what you're doing

If you cannot determine which tool to use or missing critical information, respond with:
{
  "tool": null,
  "parameters": {},
  "explanation": "Explanation of what information is missing or why you cannot help"
}

Examples:
User: "Help me translate foo.json to Japanese"
Response: {
  "tool": "sync",
  "parameters": {
    "source": "foo.json"
  },
  "explanation": "I'll sync the foo.json file to translate it to Japanese based on your configuration"
}

User: "Sync all translation files with dry run"
Response: {
  "tool": "sync",
  "parameters": {
    "dryRun": true
  },
  "explanation": "I'll preview what would change when syncing all files without making actual changes"
}

User: "What's the difference between en.json and zh.json?"
Response: {
  "tool": "diff",
  "parameters": {
    "source": "en.json",
    "target": "zh.json",
    "format": "text"
  },
  "explanation": "I'll compare the English and Chinese translation files to show you the differences"
}

Always respond with valid JSON only, no additional text.`;

export async function executeAssistant(userMessage: string, configPath?: string): Promise<void> {
  try {
    console.log("🤔 Understanding your request...");

    // c8 ignore next 2
    const resolvedConfigPath = configPath
      ? resolve(process.cwd(), configPath)
      : resolve(process.cwd(), "i18n-agent.config.json");
    let apiConfig: ApiConfig;

    // c8 ignore start
    try {
      const configContent = readFileSync(resolvedConfigPath, "utf-8");
      const config = JSON.parse(configContent);
      if (!config.api) {
        throw new Error("API configuration not found in config file");
      }
      apiConfig = config.api;
    } catch (error) {
      console.error("Error: Could not load API configuration");
      console.error(`Please ensure ${resolvedConfigPath} exists with API settings`);
      process.exit(1);
    }
    // c8 ignore end

    const response = await callTranslationApi(apiConfig, {
      messages: [
        { content: SYSTEM_PROMPT, role: "system" },
        { content: userMessage, role: "user" },
      ],
      model: apiConfig.model || "gpt-4o-mini",
    });

    let decision: {
      explanation: string;
      parameters: Record<string, unknown>;
      tool: string | null;
    };

    try {
      decision = JSON.parse(response);
      // c8 ignore start
    } catch {
      console.error("Error: AI response is not valid JSON");
      console.log("AI Response:", response);
      process.exit(1);
      // c8 ignore end
    }

    console.log(`\n💡 ${decision.explanation}\n`);

    if (!decision.tool) {
      console.log("❌ Cannot proceed: Missing information or unclear request");
      process.exit(1);
    }

    console.log(`🔧 Using tool: ${decision.tool}`);
    console.log(`📋 Parameters:`, JSON.stringify(decision.parameters, null, 2));
    console.log("\n⚙️  Executing tool...\n");

    const result = await executeToolCall(decision.tool, decision.parameters, resolvedConfigPath);

    if (result.success) {
      console.log(`\n✅ Success: ${result.message}`);
      if (result.data) {
        console.log("📊 Result:", JSON.stringify(result.data, null, 2));
      }
    } else {
      console.error(`\n❌ Failed: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
    // c8 ignore end
  }
}

export function assistantCommand(program: Command): void {
  program
    .command("ask")
    .description("Ask AI assistant to help with i18n tasks using natural language")
    .argument("[message]", "Natural language message describing what you want to do")
    .option("-c, --config <path>", "Configuration file path")
    .option("-m, --message <text>", "Alternative way to provide the message")
    .action(async (message: string | undefined, options: AssistantOptions) => {
      const userMessage = message || options.message;
      if (!userMessage) {
        console.error("Error: Please provide a message");
        console.log("\nUsage examples:");
        console.log('  i18n-agent ask "Translate foo.json to Japanese"');
        console.log('  i18n-agent ask -c ./config.json -m "Sync all files in locales directory"');
        process.exit(1);
      }

      await executeAssistant(userMessage, options.config);
    });
}
