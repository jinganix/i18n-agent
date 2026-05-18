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
          mode: syncParams.mode as "full" | "diff" | undefined,
          source: (syncParams.sourcePath || syncParams.source) as string | undefined,
          targetLocales: syncParams.targetLocales as string[] | undefined,
        });

        return {
          message: "Files synced successfully",
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
    return {
      message: `Tool execution failed: ${(error as Error).message}`,
      success: false,
    };
  }
}
