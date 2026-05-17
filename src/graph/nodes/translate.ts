import { Annotation } from "@langchain/langgraph/web";
import type { TaskBatch } from "./build.tasks.js";
import { getPromptForLocale, loadPrompt } from "../../utils/api.client.js";

export interface TranslateState {
  tasks: TaskBatch[];
  translatedResults: Record<string, Record<string, string>>;
}

export const TranslateAnnotation = Annotation.Root({
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  translatedResults: Annotation<Record<string, Record<string, string>>>({
    default: () => ({}),
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
});

export async function translateNode(
  state: typeof TranslateAnnotation.State,
): Promise<Partial<typeof TranslateAnnotation.State>> {
  const translatedResults: Record<string, Record<string, string>> = {};

  for (const task of state.tasks) {
    const promptTemplate = getPromptForLocale(task.locale);
    const inputJson = JSON.stringify(
      Object.fromEntries(task.keys.map((k) => [k.prefixedKey, k.value])),
      null,
      2,
    );

    loadPrompt(promptTemplate, {
      inputJson,
      sourceLocale: "en",
      targetLocale: task.locale,
    });

    console.log(`Translating batch ${task.batchId} to ${task.locale}...`);

    const translatedKeys: Record<string, string> = {};
    for (const key of task.keys) {
      translatedKeys[key.prefixedKey] = String(key.value);
    }

    translatedResults[`batch_${task.batchId}`] = translatedKeys;
  }

  console.log(`Translation completed for ${Object.keys(translatedResults).length} batches`);

  return {
    translatedResults,
  };
}
