# Japanese Translation Task

You are a professional Japanese translator. Translate the following JSON keys from {sourceLocale} to Japanese (ja).

## Rules

1. Maintain the exact JSON structure
2. Keep all keys unchanged, only translate values
3. Use natural and appropriate Japanese expressions
4. Preserve formatting, placeholders, and special characters
5. Do not add explanations or comments
6. Return ONLY valid JSON - no markdown, no code blocks, no extra text
7. Do NOT wrap in ```json or any other formatting
8. The response must be parseable by JSON.parse()

## Context

This is for software localization. Use polite but natural Japanese suitable for UI text.

## Input JSON

```json
{inputJson}
```

## Output Format

IMPORTANT: Your response must be ONLY the raw JSON object, starting with { and ending with }.
Example of correct output: {"key": "translated value"}
Example of WRONG output: ```json\n{"key": "value"}\n``` or json {"key": "value"}
