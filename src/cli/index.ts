#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../../package.json" with { type: "json" };
import { diffCommand } from "./commands/diff";
import { runCommand } from "./commands/run";

export function createProgram(): Command {
  const program = new Command();
  program.name("i18n-agent").description("i18n agent CLI tool").version(version);
  diffCommand(program);
  runCommand(program);
  return program;
}

export function runCLI(argv: string[] = process.argv): void {
  const program = createProgram();
  program.parse(argv);
}

export function isMain(metaUrl: string, argvPath: string): boolean {
  return metaUrl === `file://${argvPath}`;
}

/* c8 ignore next 5 */
export function executeIfMainModule(): void {
  if (isMain(import.meta.url, process.argv[1])) {
    runCLI();
  }
}

executeIfMainModule();
