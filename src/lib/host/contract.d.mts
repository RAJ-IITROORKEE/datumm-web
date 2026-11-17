import type {ATTACHMENT_LIMITS, validateAttachments, kindOf} from '../composer-attachments.mjs';

export type HostSurface = 'auth' | 'tasks' | 'native' | 'attachments' | 'settings' | 'window' | 'capabilities';
export type HostCapabilityFlag = 'hostedTasks' | 'attachments' | 'nativeBridge' | 'localSettings' | 'windowControls' | 'runTrace';
export const HOST_SURFACES: HostSurface[];
export const HOST_CAPABILITY_FLAGS: HostCapabilityFlag[];

export type NotAvailable = Readonly<{available: false; reason: string}>;
export function notAvailable(reason: string): NotAvailable;

export interface HostAuth {
  /** How the host proves identity to the task service; the UI never sees a token. */
  kind: 'web-session' | 'desktop-session';
  fetchCredentials: RequestCredentials;
}
export interface HostTasks {
  /** Calls the task service. `path` is relative, e.g. `projects/abc/brief`. */
  request(path: string, init?: RequestInit): Promise<Response>;
  /** A same-host URL for downloads and images. */
  url(path: string): string;
}
/** Read-only status. No approve method exists: Revit approval stays in the trusted native review. */
export interface HostNative { status(): NotAvailable | {available: true} }
export interface HostAttachments {
  limits: typeof ATTACHMENT_LIMITS;
  kindOf: typeof kindOf;
  validate: typeof validateAttachments;
}
export interface HostSettings { status(): NotAvailable | {available: true} }
export interface HostWindow { status(): NotAvailable | {available: true} }
export interface HostCapabilities {
  /** An unknown flag is off. */
  has(flag: HostCapabilityFlag | (string & {})): boolean;
}
export interface Host {
  auth: HostAuth;
  tasks: HostTasks;
  native: HostNative;
  attachments: HostAttachments;
  settings: HostSettings;
  window: HostWindow;
  capabilities: HostCapabilities;
}
export function missingHostMembers(host: unknown): string[];
