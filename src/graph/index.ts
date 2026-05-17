import { StateGraph, START, END } from "@langchain/langgraph/web";
import { detectChanges, StateAnnotation } from "./nodes/detect.changes.ts";

export async function runWorkflow(): Promise<void> {
  await new StateGraph(StateAnnotation)
    .addNode("detectChanges", detectChanges)
    .addEdge(START, "detectChanges")
    .addEdge("detectChanges", END)
    .compile()
    .invoke({ messages: [] });
}
