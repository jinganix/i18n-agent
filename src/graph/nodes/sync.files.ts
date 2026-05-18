import { Annotation } from "@langchain/langgraph/web";
import { join } from "path";
import type { TaskBatch } from "./build.tasks.js";
import { syncTranslationToFile, mergeWithExistingData } from "@/utils/file.syncer.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";
import { normalizeLocale } from "@/utils/locale.helpers.js";

export interface SyncFilesState {
  config: {
    sourceLocale: string;
    targetLocales: string[];
    localesDir: string;
    mode?: "full" | "diff";
  };
  tasks: TaskBatch[];
  translatedResults: Record<string, Record<string, string>>;
  syncedFiles: Array<{
    locale: string;
    filePath: string;
    keyCount: number;
  }>;
}

export const SyncFilesAnnotation = Annotation.Root({
  config: Annotation<SyncFilesState["config"]>({
    default: () => ({
      localesDir: "",
      sourceLocale: "",
      targetLocales: [],
    }),
    reducer: replaceReducer,
  }),
  syncedFiles: Annotation<SyncFilesState["syncedFiles"]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  translatedResults: Annotation<Record<string, Record<string, string>>>({
    default: () => ({}),
    reducer: replaceReducer,
  }),
});

export async function syncFilesNode(
  state: typeof SyncFilesAnnotation.State,
): Promise<Partial<typeof SyncFilesAnnotation.State>> {
  const syncedFiles: Array<{
    locale: string;
    filePath: string;
    keyCount: number;
  }> = [];

  const mode = state.config.mode || "diff";

  const batchesByLocale: Record<string, TaskBatch[]> = {};
  for (const task of state.tasks) {
    if (!batchesByLocale[task.locale]) {
      batchesByLocale[task.locale] = [];
    }
    batchesByLocale[task.locale].push(task);
  }

  for (const [locale, batches] of Object.entries(batchesByLocale)) {
    const mergedData: Record<string, string> = {};

    for (const batch of batches) {
      const batchKey = `batch_${batch.batchId}`;
      const batchData = state.translatedResults[batchKey];
      if (batchData) {
        Object.assign(mergedData, batchData);
      }
    }

    const keysByFile: Record<string, { filePath: string; data: Record<string, string> }> = {};
    for (const [prefixedKey, value] of Object.entries(mergedData)) {
      const fileId = prefixedKey.split(".")[0];
      if (!keysByFile[fileId]) {
        const taskWithFile = state.tasks.find((t) =>
          t.keys.some((k) => k.prefixedKey.startsWith(`${fileId}.`)),
        );
        if (taskWithFile) {
          const keyInfo = taskWithFile.keys.find((k) => k.prefixedKey.startsWith(`${fileId}.`));
          keysByFile[fileId] = {
            data: {},
            filePath: keyInfo!.filePath,
          };
        }
      }
      const keyWithoutId = prefixedKey.substring(fileId.length + 1);
      if (keysByFile[fileId]) {
        keysByFile[fileId].data[keyWithoutId] = value;
      }
    }

    for (const [, fileInfo] of Object.entries(keysByFile)) {
      let targetFilePath = fileInfo.filePath;
      const fileName = targetFilePath.split("/").pop()!;
      const fileExt = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";
      const fileNameWithoutExt = fileName.replace(fileExt, "");

      if (normalizeLocale(fileNameWithoutExt) === normalizeLocale(state.config.sourceLocale)) {
        const dirPath = targetFilePath.substring(0, targetFilePath.lastIndexOf(fileName));
        targetFilePath = `${dirPath}${locale}${fileExt}`;
      }

      const targetPath = join(state.config.localesDir, locale, targetFilePath);

      let finalData: Record<string, string> = fileInfo.data;
      if (mode === "diff") {
        const merged = mergeWithExistingData(targetPath, fileInfo.data);
        finalData = Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, String(v)]));
      }

      const result = syncTranslationToFile(targetPath, finalData);
      syncedFiles.push({
        filePath: result.filePath,
        keyCount: result.keyCount,
        locale,
      });

      console.log(`Synced ${result.keyCount} keys to ${result.filePath}`);
    }
  }

  console.log(`\nTotal files synced: ${syncedFiles.length}`);

  return {
    syncedFiles,
  };
}
