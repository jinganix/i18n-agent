import { StateGraph, START, END } from "@langchain/langgraph/web";
import { detectChanges, StateAnnotation } from "./nodes/detect.changes.js";
import { loadConfigNode, SyncAnnotation } from "./nodes/load.config.js";
import { scanFilesNode, ScanFilesAnnotation } from "./nodes/scan.files.js";

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

  await new StateGraph(ScanFilesAnnotation)
    .addNode("scanFiles", scanFilesNode)
    .addEdge(START, "scanFiles")
    .addEdge("scanFiles", END)
    .compile()
    .invoke(scanState);
}
