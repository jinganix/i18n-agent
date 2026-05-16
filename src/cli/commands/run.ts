import { Command } from "commander";
import { runWorkflow } from "../graph/index.js";

export async function executeRun(): Promise<void> {
  await runWorkflow();
}

export function runCommand(program: Command): void {
  program
    .command("run")
    .description("Start the i18n agent workflow")
    .action(async () => {
      await executeRun();
    });
}
