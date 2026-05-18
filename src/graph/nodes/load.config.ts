import { Annotation } from "@langchain/langgraph/web";
import { readFileSync } from "fs";
import { resolve } from "path";
import { replaceReducer } from "@/utils/langgraph.helpers.js";

export type SyncMode = "full" | "diff";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
  timeout?: number;
}

export interface SyncConfig {
  sourceLocale: string;
  targetLocales: string[];
  localesDir: string;
  tokenSize?: number;
  api?: ApiConfig;
  mode?: SyncMode;
}

export interface SyncState {
  configPath: string;
  config: SyncConfig | null;
}

export const SyncAnnotation = Annotation.Root({
  config: Annotation<SyncConfig | null>({
    default: () => null,
    reducer: replaceReducer,
  }),
  configPath: Annotation<string>({
    default: () => "",
    reducer: replaceReducer,
  }),
});

export async function loadConfigNode(
  state: typeof SyncAnnotation.State,
): Promise<Partial<typeof SyncAnnotation.State>> {
  try {
    const configPath = resolve(state.configPath);
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as SyncConfig;
    console.log("Configuration loaded:", JSON.stringify(config, null, 2));
    return {
      config,
    };
  } catch (error) {
    console.error(`Error loading config: ${(error as Error).message}`);
    throw error;
  }
}
