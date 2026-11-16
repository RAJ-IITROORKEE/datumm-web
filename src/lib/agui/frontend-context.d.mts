export type FrontendViewport = 'narrow' | 'medium' | 'wide';
export type FrontendSection = 'design' | 'activity' | 'assets' | 'exports';
export type FrontendPreview = 'drawing' | 'answer-output' | 'saved-report';
export type FrontendActionName =
  'open_work_area' | 'expand_process' | 'scroll_to_turn' | 'suggest_followup';
export type FrontendContext = {
  v: 1;
  viewport: FrontendViewport;
  workArea: {open: boolean; section: FrontendSection; preview: FrontendPreview};
  selection: {roomKey: string} | null;
  actions: FrontendActionName[];
};
export const FRONTEND_CONTEXT_DESCRIPTION: 'datumm.frontend.v1';
export const FRONTEND_CONTEXT_MAX_BYTES: 1024;
export const VIEWPORTS: FrontendViewport[];
export const SECTIONS: FrontendSection[];
export const PREVIEWS: FrontendPreview[];
export const CONTEXT_ACTIONS: FrontendActionName[];
export function viewportClass(width: number): FrontendViewport;
export function validateFrontendContext(value: unknown): FrontendContext | null;
export function buildFrontendContext(input: {
  viewportWidth: number; workAreaOpen: boolean; section: FrontendSection; preview: FrontendPreview;
  selectedKey?: string; roomKeys?: string[]; actions?: FrontendActionName[];
}): FrontendContext | null;
export function serializeFrontendContext(envelope: unknown): string | null;
export function parseFrontendContext(text: unknown): FrontendContext | null;
