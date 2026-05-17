#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../../package.json" with { type: "json" };
import { assistantCommand } from "./commands/assistant.js";
import { diffCommand } from "./commands/diff.js";
import { runCommand } from "./commands/run.js";
import { syncCommand } from "./commands/sync.js";

export function createProgram(): Command {
  const program = new Command();
  program.name("i18n-agent").description("i18n agent CLI tool").version(version);
  assistantCommand(program);
  diffCommand(program);
  runCommand(program);
  syncCommand(program);
  return program;
}

export function runCLI(argv: string[] = process.argv): void {
  const program = createProgram();
  program.parse(argv);
}

export function isMain(metaUrl: string, argvPath: string): boolean {
  // c8 ignore next
  if (!argvPath) {
    return false;
  }
  const metaPath = metaUrl.replace("file://", "");
  return (
    metaPath === argvPath ||
    metaPath.endsWith(argvPath) ||
    argvPath.endsWith("dist/cli/index.js") ||
    argvPath.includes("node_modules/i18n-agent") ||
    argvPath.includes("i18n-agent")
  );
}

// c8 ignore start
export function executeIfMainModule(): void {
  const isTestEnv = process.env.VITEST === "true";
  if (!isTestEnv) {
    runCLI();
  }
}
// c8 ignore end

executeIfMainModule();
