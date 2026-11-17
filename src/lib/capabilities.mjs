export const CAPABILITY_VERSION = 1;
export const CAPABILITY_FEATURES = ['adminConfig', 'adminAudit', 'adminOverview', 'adminKnowledge', 'planningGoals', 'frontendContext', 'displayActions', 'adminTraces', 'feedback', 'adminHistory', 'adminModels', 'modelInfo', 'attachments', 'tavilySearch'];

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// A backend that omits the object, or reports a version this build does not know, is "unknown",
// never "off": old deployments must keep every feature they serve today.
export function parseCapabilities(config) {
  const raw = isObject(config) ? config.capabilities : undefined;
  const known = isObject(raw) && raw.version === CAPABILITY_VERSION && isObject(raw.features);
  const features = {};
  for (const name of CAPABILITY_FEATURES) {
    const value = known ? raw.features[name] : undefined;
    features[name] = typeof value === 'boolean' ? (value ? 'on' : 'off') : 'unknown';
  }
  return { version: known ? CAPABILITY_VERSION : null, features };
}

export const featureState = (capabilities, name) => capabilities?.features?.[name] ?? 'unknown';

// An old backend rejects `clientContext` with 422, so these N2 features treat unknown as OFF.
export const featureEnabled = (capabilities, name) => featureState(capabilities, name) === 'on';

// Planning goals are served only by the OpenCode local app, so unknown keeps today's gate.
export function planningGoalsVisible(capabilities, { liveRuntime, desktopPreview }) {
  const state = featureState(capabilities, 'planningGoals');
  if (state === 'on') return true;
  return desktopPreview || (state === 'unknown' && liveRuntime);
}
