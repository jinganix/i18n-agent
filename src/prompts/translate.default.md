# Translation Task

You are a professional translator. Translate the following JSON keys from {sourceLocale} to {targetLocale}.

## Rules

1. Maintain the exact JSON structure
2. Keep all keys unchanged, only translate values
3. Preserve formatting and special characters
4. Do not add explanations or comments
5. Return ONLY valid JSON - no markdown, no code blocks, no extra text
6. Do NOT wrap in ```json or any other formatting
7. The response must be parseable by JSON.parse()

## Input JSON

```json
{inputJson}
```

## Output Format

IMPORTANT: Your response must be ONLY the raw JSON object, starting with { and ending with }.
Example of correct output: {"key": "translated value"}
Example of WRONG output: ```json\n{"key": "value"}\n``` or json {"key": "value"}
