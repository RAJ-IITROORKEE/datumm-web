export type ModelInfo = {
  promptPerM?: number;
  completionPerM?: number;
  contextLength?: number;
  imageInput?: boolean;
};
export type ModelInfoMap = Record<string, ModelInfo>;
export function modelName(model: string): string;
export function modelProvider(model: string): string;
/** Keeps only served ids and valid fields; anything else is dropped. */
export function parseModelInfo(raw: unknown, served: string[]): ModelInfoMap;
/** Price, context and image labels, only for what is known. */
export function modelFacts(info: ModelInfo | undefined): string[];
export function groupModels(
  models: string[],
  defaultModel: string | undefined,
): { provider: string; models: string[] }[];
