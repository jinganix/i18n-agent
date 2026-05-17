import { Annotation } from "@langchain/langgraph/web";
import { readFileSync } from "fs";
import type { FileItem } from "@/utils/file.scanner.js";
import { normalizeKeys, NormalizedResult } from "@/utils/normalize.keys.js";

export interface FlattenKeysState {
  files: FileItem[];
  flattenedData: Record<string, NormalizedResult>;
}

export const FlattenKeysAnnotation = Annotation.Root({
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
});

export async function flattenKeysNode(
  state: typeof FlattenKeysAnnotation.State,
): Promise<Partial<typeof FlattenKeysAnnotation.State>> {
  const flattenedData: Record<string, NormalizedResult> = {};

  for (const file of state.files) {
    try {
      const content = readFileSync(file.absolutePath, "utf-8");
      const jsonData = JSON.parse(content);
      const normalized = normalizeKeys(jsonData);

      const prefixedData: NormalizedResult = {};
      for (const [key, value] of Object.entries(normalized)) {
        prefixedData[`${file.id}.${key}`] = value;
      }

      flattenedData[file.relativePath] = prefixedData;
      console.log(`Flattened file [${file.id}]: ${file.relativePath}`);
    } catch (error) {
      console.error(`Error processing file ${file.relativePath}: ${(error as Error).message}`);
      throw error;
    }
  }

  console.log(`\nTotal files flattened: ${Object.keys(flattenedData).length}`);

  return {
    flattenedData,
  };
}
