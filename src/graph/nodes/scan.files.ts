import { Annotation } from "@langchain/langgraph/web";
import { statSync } from "fs";
import { join, relative, resolve } from "path";
import type { SyncConfig } from "./load.config.js";
import { collectJsonFiles, logFileList, type FileItem } from "@/utils/file.scanner.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";

export interface ScanFilesState {
  config: SyncConfig | null;
  sourcePath?: string;
  files: FileItem[];
}

export const ScanFilesAnnotation = Annotation.Root({
  config: Annotation<SyncConfig | null>({
    default: () => null,
    reducer: replaceReducer,
  }),
  files: Annotation<FileItem[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  sourcePath: Annotation<string | undefined>({
    default: () => undefined,
    reducer: replaceReducer,
  }),
});

export async function scanFilesNode(
  state: typeof ScanFilesAnnotation.State,
): Promise<Partial<typeof ScanFilesAnnotation.State>> {
  if (!state.config) {
    throw new Error("Configuration not loaded");
  }

  const localesDir = resolve(state.config.localesDir);
  const sourceLocaleDir = join(localesDir, state.config.sourceLocale);

  let targetPath: string;

  if (state.sourcePath) {
    targetPath = resolve(state.sourcePath);

    // Validate that sourcePath is within locales directory
    if (!targetPath.startsWith(localesDir)) {
      throw new Error(
        `Source path must be within the locales directory: ${localesDir}\n` +
          `Provided path: ${targetPath}`,
      );
    }
  } else {
    targetPath = sourceLocaleDir;
  }

  const files: FileItem[] = [];
  const stats = statSync(targetPath);

  if (stats.isFile()) {
    if (!targetPath.endsWith(".json")) {
      throw new Error("Source file must be a JSON file");
    }
    const relPath = relative(sourceLocaleDir, targetPath);
    files.push({
      absolutePath: targetPath,
      id: 1,
      relativePath: relPath,
    });
  } else if (stats.isDirectory()) {
    collectJsonFiles(targetPath, sourceLocaleDir, files, 1);
  } else {
    throw new Error(`Invalid path: ${targetPath}`);
  }

  logFileList(files);

  return {
    files,
  };
}
