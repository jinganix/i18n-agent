import { Annotation } from "@langchain/langgraph/web";
import { join } from "path";
import type { TaskBatch } from "./build.tasks.js";
import { syncTranslationToFile } from "@/utils/file.syncer.js";

export interface SyncFilesState {
  config: {
    sourceLocale: string;
    targetLocales: string[];
    localesDir: string;
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
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  syncedFiles: Annotation<SyncFilesState["syncedFiles"]>({
    default: () => [],
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  translatedResults: Annotation<Record<string, Record<string, string>>>({
    default: () => ({}),
    // c8 ignore next
    reducer: (x, y) => y ?? x,
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

  const batchesByLocale: Record<string, TaskBatch[]> = {};
  for (const task of state.tasks) {
    // c8 ignore next
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
      // c8 ignore next
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
        // c8 ignore next
        if (taskWithFile) {
          const keyInfo = taskWithFile.keys.find((k) => k.prefixedKey.startsWith(`${fileId}.`));
          keysByFile[fileId] = {
            data: {},
            filePath: keyInfo!.filePath,
          };
        }
      }
      const keyWithoutId = prefixedKey.substring(fileId.length + 1);
      // c8 ignore next
      if (keysByFile[fileId]) {
        keysByFile[fileId].data[keyWithoutId] = value;
      }
    }

    for (const [, fileInfo] of Object.entries(keysByFile)) {
      let targetFilePath = fileInfo.filePath;
      // c8 ignore next
      const fileName = targetFilePath.split("/").pop() || "";
      // c8 ignore next
      const fileExt = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";
      const fileNameWithoutExt = fileName.replace(fileExt, "");

      if (fileNameWithoutExt === state.config.sourceLocale) {
        // c8 ignore next 2
        const dirPath = targetFilePath.substring(0, targetFilePath.lastIndexOf(fileName));
        targetFilePath = `${dirPath}${locale}${fileExt}`;
      }

      const targetPath = join(state.config.localesDir, locale, targetFilePath);

      const result = syncTranslationToFile(targetPath, fileInfo.data);
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
