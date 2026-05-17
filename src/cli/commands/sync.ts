import { Command } from "commander";
import { readFileSync } from "fs";
import { syncWorkflow } from "../../graph/index.js";

export interface SyncOptions {
  source?: string;
}

export async function executeSync(options: SyncOptions): Promise<void> {
  if (!options.source) {
    console.error("Error: Source file is required");
    console.log("\nUsage: i18n-agent sync -s <source.json>");
    process.exit(1);
  }

  try {
    const content = readFileSync(options.source, "utf-8");
    const jsonData = JSON.parse(content);
    await syncWorkflow(jsonData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in file ${options.source}`);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

export function syncCommand(program: Command): void {
  program
    .command("sync")
    .description("Normalize i18n JSON keys to flat dot notation")
    .option("-s, --source <path>", "Source JSON file path")
    .action(async (options: SyncOptions) => {
      await executeSync(options);
    });
}
