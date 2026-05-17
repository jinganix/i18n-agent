import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

export interface FileItem {
  id: number;
  relativePath: string;
  absolutePath: string;
}

/**
 * Recursively collect all JSON files from a directory
 * @param dir - Directory to scan
 * @param baseDir - Base directory for calculating relative paths
 * @param files - Array to collect file items
 * @param startId - Starting ID for file numbering
 * @returns Next available ID
 */
export function collectJsonFiles(
  dir: string,
  baseDir: string,
  files: FileItem[],
  startId: number,
): number {
  let currentId = startId;
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      currentId = collectJsonFiles(fullPath, baseDir, files, currentId);
    } else if (entry.endsWith(".json")) {
      const relPath = relative(baseDir, fullPath);
      files.push({
        absolutePath: fullPath,
        id: currentId++,
        relativePath: relPath,
      });
    }
  }

  return currentId;
}

/**
 * Log file list to console
 * @param files - Array of file items to log
 */
export function logFileList(files: FileItem[]): void {
  console.log(`Found ${files.length} file(s) to process:`);
  files.forEach((file) => {
    console.log(`  [${file.id}] ${file.relativePath}`);
  });
}
