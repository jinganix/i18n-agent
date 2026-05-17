import { StateGraph, START, END } from "@langchain/langgraph/web";
import { detectChanges, StateAnnotation } from "./nodes/detect.changes.js";
import { loadConfigNode, SyncAnnotation } from "./nodes/load.config.js";

export async function runWorkflow(): Promise<void> {
  await new StateGraph(StateAnnotation)
    .addNode("detectChanges", detectChanges)
    .addEdge(START, "detectChanges")
    .addEdge("detectChanges", END)
    .compile()
    .invoke({ messages: [] });
}

export async function syncWorkflow(configPath: string): Promise<void> {
  await new StateGraph(SyncAnnotation)
    .addNode("loadConfig", loadConfigNode)
    .addEdge(START, "loadConfig")
    .addEdge("loadConfig", END)
    .compile()
    .invoke({ configPath });
}
