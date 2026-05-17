import { Annotation } from "@langchain/langgraph/web";
import type { FileItem } from "@/utils/file.scanner.js";
import { detectAllChanges, type DetectionResult } from "@/utils/git.diff.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";

export const DetectChangesAnnotation = Annotation.Root({
  detectionResults: Annotation<Record<string, DetectionResult>>({
    default: () => ({}),
    reducer: replaceReducer,
  }),
  files: Annotation<FileItem[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  targetFiles: Annotation<Record<string, string> | undefined>({
    default: () => undefined,
    reducer: replaceReducer,
  }),
});

export async function detectChangesNode(
  state: typeof DetectChangesAnnotation.State,
): Promise<Partial<typeof DetectChangesAnnotation.State>> {
  const detectionResults: Record<string, DetectionResult> = {};

  console.log("\n🔍 Detecting changes in source files...\n");

  for (const file of state.files) {
    console.log(`  Checking: ${file.relativePath}`);

    let targetPath: string | undefined;
    if (state.targetFiles) {
      const targetLocale = Object.keys(state.targetFiles)[0];

      if (targetLocale && state.targetFiles[targetLocale]) {
        targetPath = state.targetFiles[targetLocale];
      }
    }

    try {
      const result = detectAllChanges(file.absolutePath, targetPath);
      detectionResults[file.relativePath] = result;

      const summary = result.summary;
      if (summary.totalAdded > 0 || summary.totalDeleted > 0 || summary.totalMissingInTarget > 0) {
        console.log(`    ✓ Found changes:`);
        if (summary.totalAdded > 0) {
          console.log(`      + ${summary.totalAdded} keys added`);
        }
        if (summary.totalDeleted > 0) {
          console.log(`      - ${summary.totalDeleted} keys deleted`);
        }
        if (summary.totalMissingInTarget > 0) {
          console.log(`      ! ${summary.totalMissingInTarget} keys missing in target`);
        }
      } else {
        console.log(`    ✓ No changes detected`);
      }
    } catch (error) {
      console.error(
        `    ✗ Error detecting changes for ${file.relativePath}: ${(error as Error).message}`,
      );
    }
  }

  console.log("\n✅ Change detection completed\n");

  return {
    detectionResults,
  };
}
