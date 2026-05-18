import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { executeToolCall } from "../utils/tool.executor.js";
import type { ApiConfig } from "@/graph/nodes/load.config.js";
import { callTranslationApi } from "@/utils/api.client.js";
import { validateAndNormalizeLocales } from "@/utils/locale.helpers.js";

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
        mode: {
          description:
            "Sync mode: full or diff (default: diff). Full replaces all keys, diff preserves existing keys and only translates new ones",
          type: "string",
        },
        source: {
          description:
            "Source file or directory path relative to source locale (optional, syncs all if not specified)",
          type: "string",
        },
        targetLocales: {
          description:
            "Array of target locale codes to translate to (e.g., ['zh', 'ru']). If provided, overrides the targetLocales in config file",
          items: {
            type: "string",
          },
          type: "array",
        },
      },
      required: ["config"],
      type: "object",
    },
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptTemplatePath = resolve(__dirname, "../../prompts/assistant.md");

function loadPromptTemplate(): string {
  try {
    return readFileSync(promptTemplatePath, "utf-8");
  } catch {
    // c8 ignore next
    throw new Error(`Failed to load prompt template from ${promptTemplatePath}`);
  }
}

function buildSystemPrompt(): string {
  const template = loadPromptTemplate();
  const toolsDescription = AVAILABLE_TOOLS.map(
    (tool) => `- ${tool.name}: ${tool.description}`,
  ).join("\n");
  return template.replace("{{tools}}", toolsDescription);
}

const SYSTEM_PROMPT = buildSystemPrompt();

export async function executeAssistant(userMessage: string, configPath?: string): Promise<void> {
  try {
    console.log("🤔 Understanding your request...");

    const resolvedConfigPath = configPath
      ? resolve(process.cwd(), configPath)
      : resolve(process.cwd(), "i18n-agent.config.json");
    let apiConfig: ApiConfig;

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
    } catch {
      console.error("Error: AI response is not valid JSON");
      console.log("AI Response:", response);
      process.exit(1);
    }

    console.log(`\n💡 ${decision.explanation}\n`);

    if (!decision.tool) {
      console.log("❌ Cannot proceed: Missing information or unclear request");
      process.exit(1);
    }

    if (decision.tool === "sync" && decision.parameters.targetLocales) {
      try {
        const validatedLocales = validateAndNormalizeLocales(
          decision.parameters.targetLocales as string[],
        );
        decision.parameters.targetLocales = validatedLocales;
        console.log(`🌍 Validated target locales: ${validatedLocales.join(", ")}`);
      } catch (error) {
        console.error(`❌ Invalid locale format: ${(error as Error).message}`);
        console.log("\n💡 Please use BCP 47 format (e.g., zh-CN, en-US, ja-JP)");
        process.exit(1);
      }
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
