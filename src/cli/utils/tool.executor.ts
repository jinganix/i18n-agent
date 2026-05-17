import { executeDiff } from "../commands/diff.js";
import type { DiffOptions } from "../commands/diff.js";
import { executeSync } from "../commands/sync.js";
import type { SyncOptions } from "../commands/sync.js";

export interface ToolCallResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function executeToolCall(
  toolName: string,
  parameters: Record<string, unknown>,
  defaultConfigPath?: string,
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "sync": {
        const syncParams = parameters as Partial<SyncOptions> & { sourcePath?: string };
        // Use provided config or fall back to default
        const config = (syncParams.config || defaultConfigPath) as string | undefined;
        if (!config) {
          return {
            message: "Missing required parameter: config",
            success: false,
          };
        }

        console.log(`\n🔄 Executing sync...`);
        await executeSync({
          config,
          dryRun: syncParams.dryRun as boolean | undefined,
          // c8 ignore next
          source: (syncParams.sourcePath || syncParams.source) as string | undefined,
        });

        return {
          message: "Files synced successfully",
          success: true,
        };
      }

      case "diff": {
        const diffParams = parameters as Partial<DiffOptions>;
        if (!diffParams.source || !diffParams.target) {
          return {
            message: "Missing required parameters: source and target",
            success: false,
          };
        }

        console.log(`\n🔍 Executing diff...`);
        await executeDiff({
          // c8 ignore next
          format: (diffParams.format as "json" | "text" | "table") || "text",
          source: diffParams.source as string,
          target: diffParams.target as string,
        });

        return {
          message: "Diff analysis completed",
          success: true,
        };
      }

      default:
        return {
          message: `Unknown tool: ${toolName}`,
          success: false,
        };
    }
  } catch (error) {
    // c8 ignore start
    return {
      message: `Tool execution failed: ${(error as Error).message}`,
      success: false,
    };
    // c8 ignore end
  }
}
