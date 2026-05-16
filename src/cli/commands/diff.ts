import { Command } from "commander";

export interface DiffOptions {
  source?: string;
  target?: string;
  format?: string;
  output?: string;
}

export function executeDiff(options: DiffOptions): void {
  console.log("i18n-agent diff command executed");
  console.log("Options:", options);

  // TODO: implement specific diff logic
  if (!options.source || !options.target) {
    console.log("\nUsage example:");
    console.log("  i18n-agent diff -s ./src/locales/en.json -t ./src/locales/zh.json");
    console.log("  i18n-agent diff -s ./locales/en -t ./locales/zh -f json -o diff-result.json");
    return;
  }

  console.log(`\nComparing:`);
  console.log(`  Source: ${options.source}`);
  console.log(`  Target: ${options.target}`);
  console.log(`  Format: ${options.format}`);
  if (options.output) {
    console.log(`  Output: ${options.output}`);
  }
}

export function diffCommand(program: Command): void {
  program
    .command("diff")
    .description("Compare and analyze i18n differences")
    .option("-s, --source <path>", "Source file or directory path")
    .option("-t, --target <path>", "Target file or directory path")
    .option("-f, --format <format>", "Output format (text, json, html)", "text")
    .option("-o, --output <path>", "Output file path")
    .action((options: DiffOptions) => {
      executeDiff(options);
    });
}
