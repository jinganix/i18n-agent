import { StateGraph, START, END } from "@langchain/langgraph/web";
import { buildTasksNode, BuildTasksAnnotation } from "./nodes/build.tasks.js";
import { detectChanges, StateAnnotation } from "./nodes/detect.changes.js";
import { flattenKeysNode, FlattenKeysAnnotation } from "./nodes/flatten.keys.js";
import { loadConfigNode, SyncAnnotation } from "./nodes/load.config.js";
import { scanFilesNode, ScanFilesAnnotation } from "./nodes/scan.files.js";
import { translateNode, TranslateAnnotation } from "./nodes/translate.js";

export async function runWorkflow(): Promise<void> {
  await new StateGraph(StateAnnotation)
    .addNode("detectChanges", detectChanges)
    .addEdge(START, "detectChanges")
    .addEdge("detectChanges", END)
    .compile()
    .invoke({ messages: [] });
}

export async function syncWorkflow(configPath: string, sourcePath?: string): Promise<void> {
  const configResult = await new StateGraph(SyncAnnotation)
    .addNode("loadConfig", loadConfigNode)
    .addEdge(START, "loadConfig")
    .addEdge("loadConfig", END)
    .compile()
    .invoke({ configPath });

  const scanState = {
    config: (configResult as typeof SyncAnnotation.State).config,
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
    config: (configResult as typeof SyncAnnotation.State).config!,
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
    tasks: (buildResult as typeof BuildTasksAnnotation.State).tasks,
    translatedResults: {},
  };

  await new StateGraph(TranslateAnnotation)
    .addNode("translate", translateNode)
    .addEdge(START, "translate")
    .addEdge("translate", END)
    .compile()
    .invoke(translateState);
}
