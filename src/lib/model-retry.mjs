// Provider failures a second model may get past. Native and workflow failures are not listed on
// purpose: a different model would repeat them.
export const RETRY_CODES = ['provider_timeout', 'provider_unavailable', 'provider_schema_invalid'];

// A row without `ownerId` comes from the owner-scoped task list.
export const retryableFailure = (run, ownerId) =>
  run?.status === 'failed' && run.mode !== 'build' &&
  RETRY_CODES.includes(run.data?.failure?.code) && (!run.ownerId || run.ownerId === ownerId);

/** The default model first, otherwise the first other served model; null when there is none. */
export function alternateModel(models, current, defaultModel) {
  const served = Array.isArray(models) ? models : [];
  if (defaultModel && defaultModel !== current && served.includes(defaultModel)) {
    return defaultModel;
  }
  return served.find(id => id !== current) ?? null;
}
