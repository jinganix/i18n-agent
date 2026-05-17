import { StateGraph, START, END } from "@langchain/langgraph/web";
import { detectChanges, StateAnnotation } from "./nodes/detect.changes.js";
import { normalizeNode, NormalizeAnnotation } from "./nodes/normalize.node.js";

export async function runWorkflow(): Promise<void> {
  await new StateGraph(StateAnnotation)
    .addNode("detectChanges", detectChanges)
    .addEdge(START, "detectChanges")
    .addEdge("detectChanges", END)
    .compile()
    .invoke({ messages: [] });
}

export async function syncWorkflow(input: Record<string, unknown>): Promise<void> {
  await new StateGraph(NormalizeAnnotation)
    .addNode("normalize", normalizeNode)
    .addEdge(START, "normalize")
    .addEdge("normalize", END)
    .compile()
    .invoke({ input });
}
