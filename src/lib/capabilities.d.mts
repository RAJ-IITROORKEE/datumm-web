export type FeatureState = 'on' | 'off' | 'unknown';
export type CapabilityFeature = 'adminConfig' | 'adminAudit' | 'adminOverview' | 'adminKnowledge' | 'planningGoals' | 'frontendContext' | 'displayActions' | 'adminTraces' | 'feedback' | 'adminHistory' | 'adminModels' | 'modelInfo' | 'attachments' | 'tavilySearch' | 'adminTools' | 'approvalModes' | 'skillsOnDemand' | 'builtinSkills' | 'planEditing' | 'dailyLimits' | 'runSteps' | 'redlines' | 'revitChecks' | 'mcpRegistry';
export type Capabilities = { version: 1 | null; features: Record<CapabilityFeature, FeatureState>; reasons: Partial<Record<CapabilityFeature, string>> };
export const CAPABILITY_VERSION: 1;
export const CAPABILITY_FEATURES: CapabilityFeature[];
export function parseCapabilities(config: unknown): Capabilities;
export function featureState(capabilities: Capabilities | null | undefined, name: CapabilityFeature): FeatureState;
/** True only when the backend reports the feature on; unknown is off. */
export function featureEnabled(capabilities: Capabilities | null | undefined, name: CapabilityFeature): boolean;
export function planningGoalsVisible(
  capabilities: Capabilities | null | undefined,
  gate: { liveRuntime: boolean; desktopPreview: boolean },
): boolean;
