import { Annotation } from "@langchain/langgraph/web";
import type { TaskBatch } from "./build.tasks.js";
import type { ApiConfig } from "./load.config.js";
import { callTranslationApi, getPromptForLocale, loadPrompt } from "@/utils/api.client.js";
import { cleanJson } from "@/utils/json.cleaner.js";

export interface TranslateState {
  tasks: TaskBatch[];
  translatedResults: Record<string, Record<string, string>>;
  dryRun?: boolean;
  apiConfig?: ApiConfig;
}

export const TranslateAnnotation = Annotation.Root({
  apiConfig: Annotation<ApiConfig | undefined>({
    default: () => undefined,
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
  dryRun: Annotation<boolean>({
    default: () => false,
    // c8 ignore next
    reducer: (x, y) => y ?? x,
  }),
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
    if (state.dryRun) {
      console.log(`[Dry Run] Skipping translation for batch ${task.batchId} to ${task.locale}...`);
      const translatedKeys: Record<string, string> = {};
      for (const key of task.keys) {
        translatedKeys[key.prefixedKey] = String(key.value);
      }
      translatedResults[`batch_${task.batchId}`] = translatedKeys;
    } else {
      const promptTemplate = getPromptForLocale(task.locale);
      const inputJson = JSON.stringify(
        Object.fromEntries(task.keys.map((k) => [k.prefixedKey, k.value])),
        null,
        2,
      );

      const prompt = loadPrompt(promptTemplate, {
        inputJson,
        sourceLocale: "en",
        targetLocale: task.locale,
      });

      console.log(`Translating batch ${task.batchId} to ${task.locale}...`);

      // c8 ignore start
      if (!state.apiConfig) {
        throw new Error("API configuration is required for translation");
      }
      // c8 ignore end

      const response = await callTranslationApi(state.apiConfig, {
        messages: [
          { content: prompt, role: "system" },
          { content: inputJson, role: "user" },
        ],
        model: state.apiConfig.model || "gpt-4o-mini",
      });

      // Clean the response to handle extra characters from AI
      const cleanedResponse = cleanJson(response);
      translatedResults[`batch_${task.batchId}`] = JSON.parse(cleanedResponse);
    }
  }

  console.log(`Translation completed for ${Object.keys(translatedResults).length} batches`);

  return {
    translatedResults,
  };
}
