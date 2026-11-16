export type FeatureState = 'on' | 'off' | 'unknown';
export type CapabilityFeature = 'adminConfig' | 'adminAudit' | 'adminOverview' | 'adminKnowledge' | 'planningGoals';
export type Capabilities = { version: 1 | null; features: Record<CapabilityFeature, FeatureState> };
export const CAPABILITY_VERSION: 1;
export const CAPABILITY_FEATURES: CapabilityFeature[];
export function parseCapabilities(config: unknown): Capabilities;
export function featureState(capabilities: Capabilities | null | undefined, name: CapabilityFeature): FeatureState;
export function planningGoalsVisible(
  capabilities: Capabilities | null | undefined,
  gate: { liveRuntime: boolean; desktopPreview: boolean },
): boolean;
