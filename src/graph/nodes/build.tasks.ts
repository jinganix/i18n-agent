import { Annotation } from "@langchain/langgraph/web";
import type { FileItem } from "../../utils/file.scanner.js";
import type { NormalizedResult } from "../../utils/normalize.keys.js";
import { estimateObjectTokens } from "../../utils/token.estimator.js";

export interface TaskBatch {
  batchId: number;
  locale: string;
  keys: Array<{
    fileId: number;
    filePath: string;
    prefixedKey: string;
    value: string | number | boolean | null;
  }>;
  tokenCount: number;
}

export interface BuildTasksState {
  config: {
    sourceLocale: string;
    targetLocales: string[];
    localesDir: string;
    model?: string;
    tokenSize?: number;
  };
  files: FileItem[];
  flattenedData: Record<string, NormalizedResult>;
  tasks: TaskBatch[];
  lastCompletedBatchId: number;
}

export const BuildTasksAnnotation = Annotation.Root({
  config: Annotation<BuildTasksState["config"]>({
    default: () => ({
      localesDir: "",
      sourceLocale: "",
      targetLocales: [],
    }),
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  files: Annotation<FileItem[]>({
    default: () => [],
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  flattenedData: Annotation<Record<string, NormalizedResult>>({
    default: () => ({}),
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  lastCompletedBatchId: Annotation<number>({
    default: () => 0,
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
});

export async function buildTasksNode(
  state: typeof BuildTasksAnnotation.State,
): Promise<Partial<typeof BuildTasksAnnotation.State>> {
  const tokenSize = state.config.tokenSize || 3000;
  const tasks: TaskBatch[] = [];
  let batchId = state.lastCompletedBatchId + 1;

  for (const targetLocale of state.config.targetLocales) {
    const localeKeys: Array<{
      fileId: number;
      filePath: string;
      prefixedKey: string;
      value: string | number | boolean | null;
    }> = [];

    for (const [, data] of Object.entries(state.flattenedData)) {
      for (const [prefixedKey, value] of Object.entries(data)) {
        const fileId = parseInt(prefixedKey.split(".")[0], 10);
        localeKeys.push({
          fileId,
          filePath: state.files[fileId - 1].relativePath,
          prefixedKey,
          value,
        });
      }
    }

    let currentBatch: Array<{
      fileId: number;
      filePath: string;
      prefixedKey: string;
      value: string | number | boolean | null;
    }> = [];
    let currentTokenCount = 0;

    for (const keyItem of localeKeys) {
      const keyTokens = estimateObjectTokens({ [keyItem.prefixedKey]: keyItem.value });

      if (currentTokenCount + keyTokens > tokenSize && currentBatch.length > 0) {
        tasks.push({
          batchId,
          keys: currentBatch,
          locale: targetLocale,
          tokenCount: currentTokenCount,
        });
        batchId++;
        currentBatch = [];
        currentTokenCount = 0;
      }

      currentBatch.push({
        fileId: keyItem.fileId,
        filePath: keyItem.filePath,
        prefixedKey: keyItem.prefixedKey,
        value: keyItem.value,
      });
      currentTokenCount += keyTokens;
    }

    if (currentBatch.length > 0) {
      tasks.push({
        batchId,
        keys: currentBatch,
        locale: targetLocale,
        tokenCount: currentTokenCount,
      });
      batchId++;
    }
  }

  console.log(`Built ${tasks.length} task batches`);
  tasks.forEach((task) => {
    console.log(
      `  Batch ${task.batchId}: ${task.locale} (${task.keys.length} keys, ${task.tokenCount} tokens)`,
    );
  });

  return {
    lastCompletedBatchId: state.lastCompletedBatchId,
    tasks,
  };
}
