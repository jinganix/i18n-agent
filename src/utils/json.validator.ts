export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateJsonStructure(
  inputKeys: string[],
  outputData: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  try {
    JSON.stringify(outputData);
  } catch {
    return {
      errors: ["Output is not valid JSON"],
      isValid: false,
    };
  }

  const outputKeys = Object.keys(outputData);
  const inputKeySet = new Set(inputKeys);
  const outputKeySet = new Set(outputKeys);

  const missingKeys = inputKeys.filter((key) => !outputKeySet.has(key));
  const extraKeys = outputKeys.filter((key) => !inputKeySet.has(key));

  if (missingKeys.length > 0) {
    errors.push(`Missing keys: ${missingKeys.join(", ")}`);
  }

  if (extraKeys.length > 0) {
    errors.push(`Extra keys: ${extraKeys.join(", ")}`);
  }

  return {
    errors,
    isValid: errors.length === 0,
  };
}

export function validateTranslationBatch(
  batchId: number,
  locale: string,
  inputKeys: Array<{ prefixedKey: string; value: unknown }>,
  translatedData: Record<string, string>,
): ValidationResult {
  const inputKeyStrings = inputKeys.map((k) => k.prefixedKey);
  const result = validateJsonStructure(inputKeyStrings, translatedData);

  if (!result.isValid) {
    result.errors.unshift(`Batch ${batchId} (${locale}): Validation failed`);
  }

  return result;
}
