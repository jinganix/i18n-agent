import { Annotation } from "@langchain/langgraph/web";
import { normalizeKeys, NormalizedResult } from "../../utils/normalize.keys.js";

export interface NormalizeState {
  input: Record<string, unknown>;
  output: NormalizedResult | null;
}

export const NormalizeAnnotation = Annotation.Root({
  input: Annotation<Record<string, unknown>>({
    default: () => ({}),
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  output: Annotation<NormalizedResult | null>({
    default: () => null,
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
});

export async function normalizeNode(
  state: typeof NormalizeAnnotation.State,
): Promise<Partial<typeof NormalizeAnnotation.State>> {
  const result = normalizeKeys(state.input);
  console.log(JSON.stringify(result, null, 2));
  return {
    output: result,
  };
}
