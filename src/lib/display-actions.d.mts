export type DisplayActionName =
  'open_work_area' | 'expand_process' | 'scroll_to_turn' | 'suggest_followup';
export type DisplaySection = 'design' | 'activity' | 'assets' | 'exports';
export type DisplayAction =
  | {action: 'open_work_area'; section: DisplaySection}
  | {action: 'expand_process'; turnId: string}
  | {action: 'scroll_to_turn'; turnId: string}
  | {action: 'suggest_followup'; text: string};
export type DisplayDenial = 'unknown' | 'unbound' | 'history' | 'stale' | 'missing_target';
export type DisplayScope = {key: string; epoch: number};
export type DisplayCompletion = {
  status: string; taskId: string; turnId: string; answerHash: string;
};
export type DisplayValidation =
  | {actions: DisplayAction[]; denied?: undefined}
  | {denied: DisplayDenial; actions?: DisplayAction[]};
/** Fields an action may change; each is compared and restored by Undo. */
export type DisplayView = {
  section?: DisplaySection; workAreaOpen?: boolean | null; workspacePane?: 'chat' | 'drawing';
  processOpen?: boolean; scrollTop?: number; placeholder?: string | null;
};
export type DisplayField = keyof DisplayView;
export type UndoRecord = {
  action: DisplayActionName; scope: DisplayScope; before: DisplayView; applied: DisplayView;
  unchecked: DisplayField[]; noop: boolean;
};
export type DisplayItemState = 'applied' | 'noop' | 'undone' | 'offered' | 'skipped';
/** What a browser records for the command it just sent; `key` is that command's idempotency key. */
export type LiveSubmission = {
  key: string; taskId: string | null; scope: DisplayScope | null; submission: {startCursor: number};
};

export const DISPLAY_ACTIONS: DisplayActionName[];
export const FOLLOWUP_MAX: 160;
export function parseDisplayActions(value: unknown): DisplayAction[] | null;
export function validateDisplayItems(value: unknown, turnIds?: string[]): DisplayAction[] | null;
/**
 * `value` is presentation.actions:
 * {schemaVersion:1, kind:'display-actions', answerHash, taskId, turnId, items}.
 */
export function validateDisplayActions(value: unknown, context: {
  taskId: string; turnId: string; answerHash: string; completion: unknown;
  scope: DisplayScope | null | undefined; liveScope: DisplayScope | null | undefined;
  turnIds?: string[]; live?: boolean;
}): DisplayValidation;
export function liveScopeFor(
  live: LiveSubmission | null | undefined, taskId: string, turnId: string,
  completionSequence: number, last: boolean,
): DisplayScope | null;
export function captureUndo(
  action: DisplayAction, before: DisplayView, after: DisplayView, scope: DisplayScope,
  unchecked?: DisplayField[],
): UndoRecord;
export function undoStatus(
  record: UndoRecord | null | undefined, current: DisplayView,
  liveScope: DisplayScope | null | undefined,
): {ok: true; restore: DisplayView} | {ok: false; reason: 'view_changed'};
export function describeAction(
  action: DisplayAction, state: DisplayItemState, reason?: string,
): string | null;
export function actionButtonLabel(action: DisplayAction): string;
