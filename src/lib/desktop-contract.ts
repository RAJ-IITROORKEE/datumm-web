/** Renderer DTOs for shared visual components. This application installs no native bridge. */
export interface ModelPreferences { models: string[]; defaultModel: string }
export type AgentRouting = { vision: string; evidence: string };
export type RuntimeLimits = {maxSteps:number;maxToolCalls:number;maxTaskCalls:number;maxTaskCostUsd:number;turnTimeoutSeconds:number;maxOutputTokens:number};
export interface ProviderModel { id: string; name: string; contextLength: number; tools: boolean;
  reasoning: boolean; efforts: string[]; promptPrice: string; completionPrice: string; metered?: boolean; maxCompletionTokens?: number; images?: boolean; imagePrice?: number }
export type VoiceProvider = "openai" | "groq" | "openrouter" | "local";
export interface VoiceConfiguration { provider: VoiceProvider; model: string; key?: string; executablePath?: string; modelPath?: string }
export interface VoiceModel { id: string; pricePerSecond: number }
export interface VoiceStatus { provider: VoiceProvider; configured: boolean; model: string; models: VoiceModel[]; executablePath: string; modelPath: string; error?: string }
export interface ProviderStatus { state: "missing" | "saved" | "connected"; persistent: boolean;
  models: ProviderModel[]; preferences: ModelPreferences; runtimeLimits: RuntimeLimits; verifiedAt?: number; inferenceAvailable: boolean;
  voice: VoiceStatus; routing: AgentRouting }

export type FilePartInput = { name: string; data: Uint8Array; page?: number; crop?: {x:number;y:number;width:number;height:number} };
export type AttachmentReadiness = 'parsed' | 'manifest' | 'companion-review' | 'native-inspection' | 'retained';
export type Attachment = { id: string; name: string; sha256: string; bytes: number; mime: string; readiness: AttachmentReadiness; width?: number; height?: number; sourceWidth?:number;sourceHeight?:number;crop?:FilePartInput['crop'];page?: number; pages?: number; text?: string; task?: string; createdAt: number };
export type CapabilityStatus={schemaVersion:1;revision:number;packs:{id:string;name:string;kind:'skill'|'mcp';version:string;roles:string[];capabilities:string[];defaultEnabled:boolean;distribution:string;compatibility:{openCode:string;desktopContract:number};sha256:string;enabled:boolean}[];research?:{provider:string;endpoint:string;lastError:string;coverage:string}};
export interface DesktopRelease {version:string;file:string;sha256:string;bytes:number;notes:string}
export interface UpdateStatus {state:'available'|'current'|'unpublished'|'unavailable';currentVersion:string;release?:DesktopRelease}
export interface AuthStatus {
  localTest?: boolean;
  state: "signed-out" | "pending" | "signed-in" | "expired-offline";
  subject?: string;
  name?: string;
  picture?: string;
  expiresAt?: number;
  error?: string;
  kind: "fixture-auth" | "hosted-auth" | "unconfigured";
}

export interface DesktopApi {
  demoAction:(action:'target'|'run',input:unknown)=>Promise<any>;
  traceStatus:()=>Promise<any>;
  configureTrace:(input:{endpoint:string;publicKey:string;secretKey:string})=>Promise<any>;
  readTrace:(task:string)=>Promise<any>;
  exportTrace:(task:string)=>Promise<boolean>;
  exportSupport:()=>Promise<boolean>;
  capabilityStatus:()=>Promise<CapabilityStatus>;
  configureCapabilities:(input:{expectedRevision:number;enabledIds:string[]})=>Promise<CapabilityStatus>;
  notifyTask:(input:{taskId:string;key:string;title:string})=>Promise<boolean>;
  onNavigateTask:(listener:(taskId:string)=>void)=>()=>void;
  getVersion: () => Promise<string>;
  checkUpdates:()=>Promise<UpdateStatus>;
  downloadUpdate:()=>Promise<boolean>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  windowState: () => Promise<{ maximized: boolean }>;
  onWindowState: (listener: (state: { maximized: boolean }) => void) => () => void;
  authStatus: () => Promise<AuthStatus>;
  signIn: () => Promise<AuthStatus>;
  signOut: () => Promise<AuthStatus>;
  refreshAuth: () => Promise<AuthStatus>;
  providerStatus: () => Promise<ProviderStatus>;
  connectOpenRouter: (key: string) => Promise<ProviderStatus>;
  refreshOpenRouter: () => Promise<ProviderStatus>;
  browserLoginOpenRouter: () => Promise<ProviderStatus>;
  configureModels: (preferences: ModelPreferences) => Promise<ProviderStatus>;
  configureRuntime: (limits: RuntimeLimits) => Promise<ProviderStatus>;
  configureAgents: (routing:AgentRouting) => Promise<ProviderStatus>;
  useBalancedAgents: () => Promise<ProviderStatus>;
  disconnectOpenRouter: () => Promise<ProviderStatus>;
  ingestAttachment: (input: FilePartInput) => Promise<Attachment>;
  previewAttachment: (id:string) => Promise<{attachment:Attachment;image?:string}>;
  removeAttachment: (id:string) => Promise<void>;
  refreshVoice: () => Promise<ProviderStatus>;
  configureVoice: (config:VoiceConfiguration|string) => Promise<ProviderStatus>;
  transcribe: (data:Uint8Array) => Promise<{text:string;model:string;seconds:number;reservedUsd:number;costUsd:number|null}>;
  cancelTranscription: () => Promise<void>;
  nativeBuildAction: (task:string,action:'approve'|'reconcile'|'refresh'|'show'|'select'|'design_select'|'design_prepare'|'design_context'|'design_adapt'|'design_build',input:unknown)=>Promise<unknown>;
}

