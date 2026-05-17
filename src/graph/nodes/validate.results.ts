import { Annotation } from "@langchain/langgraph/web";
import type { TaskBatch } from "./build.tasks.js";
import { validateTranslationBatch } from "@/utils/json.validator.js";
import { replaceReducer } from "@/utils/langgraph.helpers.js";

export interface ValidateResultsState {
  tasks: TaskBatch[];
  translatedResults: Record<string, Record<string, string>>;
  validationResults: Array<{
    batchId: number;
    locale: string;
    isValid: boolean;
    errors: string[];
  }>;
}

export const ValidateResultsAnnotation = Annotation.Root({
  tasks: Annotation<TaskBatch[]>({
    default: () => [],
    reducer: replaceReducer,
  }),
  translatedResults: Annotation<Record<string, Record<string, string>>>({
    default: () => ({}),
    reducer: replaceReducer,
  }),
  validationResults: Annotation<ValidateResultsState["validationResults"]>({
    default: () => [],
    reducer: replaceReducer,
  }),
});

export async function validateResultsNode(
  state: typeof ValidateResultsAnnotation.State,
): Promise<Partial<typeof ValidateResultsAnnotation.State>> {
  const validationResults: Array<{
    batchId: number;
    isValid: boolean;
    errors: string[];
    locale: string;
  }> = [];

  for (const task of state.tasks) {
    const batchKey = `batch_${task.batchId}`;
    const translatedData = state.translatedResults[batchKey];

    if (!translatedData) {
      validationResults.push({
        batchId: task.batchId,
        errors: [`No translation data found for batch ${task.batchId}`],
        isValid: false,
        locale: task.locale,
      });
      continue;
    }

    const result = validateTranslationBatch(task.batchId, task.locale, task.keys, translatedData);

    validationResults.push({
      batchId: task.batchId,
      errors: result.errors,
      isValid: result.isValid,
      locale: task.locale,
    });

    if (result.isValid) {
      console.log(`✓ Batch ${task.batchId} (${task.locale}): Validation passed`);
    } else {
      console.error(`✗ Batch ${task.batchId} (${task.locale}): Validation failed`);
      result.errors.forEach((error) => console.error(`  - ${error}`));
    }
  }

  const failedBatches = validationResults.filter((r) => !r.isValid);
  if (failedBatches.length > 0) {
    console.error(
      `\nValidation failed for ${failedBatches.length} batch(es). Please check the translation output.`,
    );
  } else {
    console.log(`\nAll ${validationResults.length} batch(es) validated successfully`);
  }

  return {
    validationResults,
  };
}
