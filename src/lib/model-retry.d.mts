export const RETRY_CODES: string[];
/** True only for a failed Ask or Plan turn whose public failure code is a provider code. */
export function retryableFailure(
  run: {status?: string; mode?: string; ownerId?: string; data?: {failure?: {code?: string}}}
    | null | undefined,
  ownerId?: string,
): boolean;
export function alternateModel(
  models: string[] | undefined,
  current: string,
  defaultModel: string | undefined,
): string | null;
