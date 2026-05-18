import { StateGraph, START, END } from "@langchain/langgraph/web";
import { buildTasksNode, BuildTasksAnnotation } from "./nodes/build.tasks.js";
import { detectChangesNode, DetectChangesAnnotation } from "./nodes/detect.changes.js";
import { flattenKeysNode, FlattenKeysAnnotation } from "./nodes/flatten.keys.js";
import { loadConfigNode, SyncAnnotation } from "./nodes/load.config.js";
import { scanFilesNode, ScanFilesAnnotation } from "./nodes/scan.files.js";
import { syncFilesNode, SyncFilesAnnotation } from "./nodes/sync.files.js";
import { translateNode, TranslateAnnotation } from "./nodes/translate.js";
import { validateResultsNode, ValidateResultsAnnotation } from "./nodes/validate.results.js";

export async function runWorkflow(): Promise<void> {
  await new StateGraph(DetectChangesAnnotation)
    .addNode("detectChanges", detectChangesNode)
    .addEdge(START, "detectChanges")
    .addEdge("detectChanges", END)
    .compile()
    .invoke({ detectionResults: {}, files: [] });
}

export async function syncWorkflow(
  configPath: string,
  sourcePath?: string,
  dryRun?: boolean,
  mode?: "full" | "diff",
  targetLocales?: string[],
): Promise<void> {
  const configResult = await new StateGraph(SyncAnnotation)
    .addNode("loadConfig", loadConfigNode)
    .addEdge(START, "loadConfig")
    .addEdge("loadConfig", END)
    .compile()
    .invoke({ configPath });

  const config = (configResult as typeof SyncAnnotation.State).config;
  if (mode) {
    config!.mode = mode;
  }
  if (targetLocales && targetLocales.length > 0) {
    config!.targetLocales = targetLocales;
  }

  const scanState = {
    config,
    files: [],
    sourcePath,
  };

  const scanResult = await new StateGraph(ScanFilesAnnotation)
    .addNode("scanFiles", scanFilesNode)
    .addEdge(START, "scanFiles")
    .addEdge("scanFiles", END)
    .compile()
    .invoke(scanState);

  const flattenState = {
    files: (scanResult as typeof ScanFilesAnnotation.State).files,
    flattenedData: {},
  };

  const flattenResult = await new StateGraph(FlattenKeysAnnotation)
    .addNode("flattenKeys", flattenKeysNode)
    .addEdge(START, "flattenKeys")
    .addEdge("flattenKeys", END)
    .compile()
    .invoke(flattenState);

  const buildState = {
    config: config!,
    files: (scanResult as typeof ScanFilesAnnotation.State).files,
    flattenedData: (flattenResult as typeof FlattenKeysAnnotation.State).flattenedData,
    lastCompletedBatchId: 0,
    tasks: [],
  };

  const buildResult = await new StateGraph(BuildTasksAnnotation)
    .addNode("buildTasks", buildTasksNode)
    .addEdge(START, "buildTasks")
    .addEdge("buildTasks", END)
    .compile()
    .invoke(buildState);

  const translateState = {
    apiConfig: config?.api,
    dryRun: dryRun || false,
    tasks: (buildResult as typeof BuildTasksAnnotation.State).tasks,
    translatedResults: {},
  };

  const translateResult = await new StateGraph(TranslateAnnotation)
    .addNode("translate", translateNode)
    .addEdge(START, "translate")
    .addEdge("translate", END)
    .compile()
    .invoke(translateState);

  const validateState = {
    tasks: (buildResult as typeof BuildTasksAnnotation.State).tasks,
    translatedResults: (translateResult as typeof TranslateAnnotation.State).translatedResults,
    validationResults: [],
  };

  await new StateGraph(ValidateResultsAnnotation)
    .addNode("validateResults", validateResultsNode)
    .addEdge(START, "validateResults")
    .addEdge("validateResults", END)
    .compile()
    .invoke(validateState);

  const syncState = {
    config: config!,
    syncedFiles: [],
    tasks: (buildResult as typeof BuildTasksAnnotation.State).tasks,
    translatedResults: (translateResult as typeof TranslateAnnotation.State).translatedResults,
  };

  await new StateGraph(SyncFilesAnnotation)
    .addNode("syncFiles", syncFilesNode)
    .addEdge(START, "syncFiles")
    .addEdge("syncFiles", END)
    .compile()
    .invoke(syncState);
}
