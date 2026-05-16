import { Annotation } from "@langchain/langgraph/web";

export const StateAnnotation = Annotation.Root({
  messages: Annotation<string[]>({
    default: () => [],
    reducer: (x, y) => x.concat(y),
  }),
});

export async function detectChanges(
  _state: typeof StateAnnotation.State,
): Promise<Partial<typeof StateAnnotation.State>> {
  console.log("hello world");
  return {
    messages: ["hello world"],
  };
}
