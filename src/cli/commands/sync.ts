import { Command } from "commander";
import { syncWorkflow } from "@/graph/index.js";

export interface SyncOptions {
  config?: string;
  source?: string;
  dryRun?: boolean;
}

export async function executeSync(options: SyncOptions): Promise<void> {
  if (!options.config) {
    console.error("Error: Config file is required");
    console.log("\nUsage: i18n-agent sync -c <config.json>");
    process.exit(1);
  }

  try {
    await syncWorkflow(options.config, options.source, options.dryRun);
    // c8 ignore start
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
    // c8 ignore end
  }
}

export function syncCommand(program: Command): void {
  program
    .command("sync")
    .description("Sync i18n files based on configuration")
    .option("-c, --config <path>", "Configuration file path")
    .option("-s, --source <path>", "Source file or directory path (relative to source locale)")
    .option("--dry-run", "Preview changes without calling AI translation API")
    .action(async (options: SyncOptions) => {
      await executeSync(options);
    });
}
