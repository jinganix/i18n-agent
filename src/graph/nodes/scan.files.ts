import { Annotation } from "@langchain/langgraph/web";
import { readdirSync, statSync } from "fs";
import { join, relative, resolve } from "path";
import type { SyncConfig } from "./load.config.js";
import { collectJsonFiles, logFileList, type FileItem } from "@/utils/file.scanner.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";
import { normalizeLocale } from "@/utils/locale.helpers.js";

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

  let targetPath: string;
  let actualSourceLocaleDir: string | undefined;

  if (state.sourcePath) {
    targetPath = resolve(state.sourcePath);

    if (!targetPath.startsWith(localesDir)) {
      throw new Error(
        `Source path must be within the locales directory: ${localesDir}\n` +
          `Provided path: ${targetPath}`,
      );
    }

    const pathParts = targetPath.split("/");
    for (let i = pathParts.length - 2; i >= 0; i--) {
      if (normalizeLocale(pathParts[i]) === normalizeLocale(state.config.sourceLocale)) {
        actualSourceLocaleDir = pathParts.slice(0, i + 1).join("/");
        break;
      }
    }

    if (!actualSourceLocaleDir) {
      throw new Error(
        `Cannot determine source locale directory from path: ${targetPath}\n` +
          `Expected path to contain source locale: ${state.config.sourceLocale}`,
      );
    }
  } else {
    const normalizedSourceLocale = normalizeLocale(state.config.sourceLocale);
    actualSourceLocaleDir = findLocaleDirectory(localesDir, normalizedSourceLocale)!;

    if (!actualSourceLocaleDir) {
      throw new Error(
        `Source locale directory not found: ${state.config.sourceLocale}\n` +
          `Looking in: ${localesDir}`,
      );
    }

    targetPath = actualSourceLocaleDir;
  }

  const files: FileItem[] = [];
  const stats = statSync(targetPath);

  if (stats.isFile()) {
    if (!targetPath.endsWith(".json")) {
      throw new Error("Source file must be a JSON file");
    }
    const relPath = relative(actualSourceLocaleDir, targetPath);
    files.push({
      absolutePath: targetPath,
      id: 1,
      relativePath: relPath,
    });
  } else if (stats.isDirectory()) {
    collectJsonFiles(targetPath, actualSourceLocaleDir, files, 1);
  } else {
    throw new Error(`Invalid path: ${targetPath}`);
  }

  logFileList(files);

  return {
    files,
  };
}

function findLocaleDirectory(localesDir: string, normalizedLocale: string): string | null {
  try {
    const entries = readdirSync(localesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryNormalized = normalizeLocale(entry.name);
        if (entryNormalized === normalizedLocale) {
          return join(localesDir, entry.name);
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}
