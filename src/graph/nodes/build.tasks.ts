import { Annotation } from "@langchain/langgraph/web";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { SyncMode } from "./load.config.js";
import type { FileItem } from "@/utils/file.scanner.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";
import { normalizeLocale } from "@/utils/locale.helpers.js";
import type { NormalizedResult } from "@/utils/normalize.keys.js";
import { estimateObjectTokens } from "@/utils/token.estimator.js";

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
    mode?: SyncMode;
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
    reducer: replaceReducer,
  }),
  files: Annotation<FileItem[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  flattenedData: Annotation<Record<string, NormalizedResult>>({
    default: () => ({}),
    reducer: replaceReducer,
  }),
  lastCompletedBatchId: Annotation<number>({
    default: () => 0,
    reducer: replaceReducer,
  }),
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
});

export async function buildTasksNode(
  state: typeof BuildTasksAnnotation.State,
): Promise<Partial<typeof BuildTasksAnnotation.State>> {
  const tokenSize = state.config.tokenSize || 3000;
  const mode = state.config.mode || "diff";
  const tasks: TaskBatch[] = [];
  let batchId = state.lastCompletedBatchId + 1;

  for (const targetLocale of state.config.targetLocales) {
    const localeKeys: Array<{
      fileId: number;
      filePath: string;
      prefixedKey: string;
      value: string | number | boolean | null;
    }> = [];

    if (mode === "diff") {
      for (const [, data] of Object.entries(state.flattenedData)) {
        for (const [prefixedKey, value] of Object.entries(data)) {
          const fileId = parseInt(prefixedKey.split(".")[0], 10);
          const file = state.files[fileId - 1];

          const targetFilePath = getTargetFilePath(
            file.relativePath,
            state.config.sourceLocale,
            targetLocale,
          );
          const targetPath = resolve(state.config.localesDir, targetLocale, targetFilePath);

          if (shouldIncludeKey(targetPath, prefixedKey)) {
            localeKeys.push({
              fileId,
              filePath: file.relativePath,
              prefixedKey,
              value,
            });
          }
        }
      }
    } else {
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

  console.log(`Built ${tasks.length} task batches in ${mode} mode`);
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

function getTargetFilePath(
  sourceFilePath: string,
  sourceLocale: string,
  targetLocale: string,
): string {
  const fileName = sourceFilePath.split("/").pop()!;
  const fileExt = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";
  const fileNameWithoutExt = fileName.replace(fileExt, "");

  if (normalizeLocale(fileNameWithoutExt) === normalizeLocale(sourceLocale)) {
    const dirPath = sourceFilePath.substring(0, sourceFilePath.lastIndexOf(fileName));
    return `${dirPath}${targetLocale}${fileExt}`;
  }
  return sourceFilePath;
}

function shouldIncludeKey(targetPath: string, prefixedKey: string): boolean {
  const fileId = prefixedKey.split(".")[0];
  const keyWithoutId = prefixedKey.substring(fileId.length + 1);

  if (!existsSync(targetPath)) {
    return true;
  }

  try {
    const content = readFileSync(targetPath, "utf-8");
    const targetData = JSON.parse(content);

    const keys = extractAllKeys(targetData);
    const flatKey = keyWithoutId.replace(/\./g, ".");

    return !keys.has(flatKey);
  } catch {
    return true;
  }
}

function extractAllKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nestedKeys = extractAllKeys(value as Record<string, unknown>, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}
