'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyAnswerCompletionHash } from '@/lib/conversation-turns.mjs';
import {
  actionButtonLabel, captureUndo, describeAction, undoStatus, validateDisplayActions,
  type DisplayAction, type DisplayItemState, type DisplayScope, type DisplaySection,
  type DisplayView, type UndoRecord,
} from '@/lib/display-actions.mjs';
import type { ActionRow } from './turn-process';

/** What the controller needs from the host: scope identity and the existing display setters. */
export type DisplayEnv = {
  enabled: boolean;
  scopeNow(): DisplayScope;
  /**
   * The scope captured at submit, only for the turn this browser just produced (its command key is
   * `turnId`); null for reload, history and turns sent from another device.
   */
  liveScope(
    taskId: string, turnId: string, completionSequence: number, last: boolean,
  ): DisplayScope | null;
  /** True when the chat stays visible beside the work area (1,180 px and wider). */
  split: boolean;
  view: {section: DisplaySection; workAreaOpen: boolean | null; workspacePane: 'chat' | 'drawing'};
  composerEmpty: boolean;
  openSection(section: DisplaySection): void;
  restoreView(fields: DisplayView): void;
};

type Item = {
  action: DisplayAction; state: DisplayItemState; reason?: string; undo?: UndoRecord;
  scope: DisplayScope;
  /** The transcript viewport scroll_to_turn moved, so Undo reads and restores the same element. */
  viewport?: HTMLElement;
};
type OfferInput = {
  taskId: string; turnId: string; completion: {completionSequence?: number; answerHash?: string};
  value: unknown; last: boolean; turnIds: string[];
};
export type DisplayActionsApi = {
  rows(taskId: string, turnId?: string): ActionRow[];
  processOpen(taskId: string, turnId: string): boolean;
  setProcessOpen(taskId: string, turnId: string, open: boolean): void;
  placeholder: string | null;
  dismissPlaceholder(): void;
  offer(input: OfferInput): void;
  enabled: boolean;
};

// Rows the user should hear: what this session applied or undid, never history offers.
const ANNOUNCED: DisplayItemState[] = ['applied', 'noop', 'undone'];
const sameScope = (a: DisplayScope, b: DisplayScope) => a.key === b.key && a.epoch === b.epoch;
const turnElement = (turnId: string) =>
  document.querySelector<HTMLElement>(`[data-turn-id="${CSS.escape(turnId)}"]`);

export function useDisplayActions(env: DisplayEnv): DisplayActionsApi {
  const envRef = useRef(env); envRef.current = env;
  const [entries, setEntries] = useState<Record<string, Item[]>>({});
  const entriesRef = useRef(entries);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const openRef = useRef(open);
  const [placeholder, setPlaceholder] = useState<{text: string; scope: DisplayScope} | null>(null);
  const placeholderRef = useRef(placeholder);
  const claimed = useRef(new Set<string>());
  const store = (next: Record<string, Item[]>) => { entriesRef.current = next; setEntries(next); };
  // Keyed by scope epoch, so switching chats starts every disclosure closed, as before N2.
  const openKey = (taskId: string, turnId: string) =>
    `${envRef.current.scopeNow().epoch}:${taskId}:${turnId}`;
  const storeOpen = (key: string, value: boolean) => {
    openRef.current = {...openRef.current, [key]: value}; setOpen(openRef.current);
  };
  const storePlaceholder = (value: typeof placeholder) => {
    placeholderRef.current = value; setPlaceholder(value);
  };

  const currentPlaceholder = () => {
    const value = placeholderRef.current;
    return value && sameScope(value.scope, envRef.current.scopeNow()) ? value.text : null;
  };
  const currentView = (taskId: string, item: Item): DisplayView => {
    const {action} = item;
    if (action.action === 'open_work_area') return {...envRef.current.view};
    if (action.action === 'expand_process') {
      return {processOpen: openRef.current[openKey(taskId, action.turnId)] ?? false};
    }
    if (action.action === 'scroll_to_turn') return {scrollTop: item.viewport?.scrollTop ?? NaN};
    return {placeholder: currentPlaceholder()};
  };

  /** Apply one action through an existing display setter; returns the row state it ended in. */
  const perform = (
    taskId: string, action: DisplayAction, scope: DisplayScope, force: boolean,
  ): Item => {
    const host = envRef.current;
    const item = (state: DisplayItemState, reason?: string, undo?: UndoRecord): Item =>
      ({action, state, reason, undo, scope});
    const finish = (
      before: DisplayView, after: DisplayView, unchecked: (keyof DisplayView)[] = [],
    ) => {
      const undo = captureUndo(action, before, after, scope, unchecked);
      return undo.noop ? item('noop') : item('applied', undefined, undo);
    };
    if (action.action === 'open_work_area') {
      // Opening the work area below 1,180 px hides the chat, so it is offered, never applied.
      if (!force && !host.split) return item('offered', 'narrow');
      const before = {...host.view};
      host.openSection(action.section);
      // On a narrow screen the user must go back to chat to reach Undo, so the pane is not
      // compared.
      const after = {
        section: action.section, workAreaOpen: true, workspacePane: 'drawing' as const,
      };
      return finish(before, after, force ? ['workspacePane'] : []);
    }
    if (action.action === 'expand_process') {
      const key = openKey(taskId, action.turnId), before = openRef.current[key] ?? false;
      storeOpen(key, true);
      return finish({processOpen: before}, {processOpen: true});
    }
    if (action.action === 'scroll_to_turn') {
      const target = turnElement(action.turnId);
      const viewport = target?.closest<HTMLElement>('.transcript-viewport');
      if (!target || !viewport) return item('skipped', 'missing_target');
      const before = viewport.scrollTop;
      target.scrollIntoView({block: 'start', behavior: 'auto'});
      return {...finish({scrollTop: before}, {scrollTop: viewport.scrollTop}), viewport};
    }
    if (!host.composerEmpty) return item('skipped', 'composer');
    storePlaceholder({text: action.text, scope});
    return finish({placeholder: null}, {placeholder: action.text});
  };

  const offer = useCallback(({taskId, turnId, completion, value, last, turnIds}: OfferInput) => {
    const host = envRef.current, key = `${taskId}:${turnId}`;
    if (!host.enabled || claimed.current.has(key)) return;
    claimed.current.add(key);
    const live = host.liveScope(taskId, turnId, Number(completion.completionSequence), last);
    const scope = host.scopeNow();
    const result = validateDisplayActions(value, {
      taskId, turnId, answerHash: String(completion.answerHash), completion,
      scope: live, liveScope: scope, turnIds, live: live !== null,
    });
    // Unknown or unbound actions are not shown at all: nothing about them is trustworthy.
    const {denied} = result;
    if (denied === 'unknown' || denied === 'unbound' || !result.actions?.length) return;
    const items = result.actions.map((action): Item => denied
      ? {action, state: denied === 'history' ? 'offered' : 'skipped', reason: denied, scope}
      : perform(taskId, action, scope, false));
    store({...entriesRef.current, [key]: items});
  }, []);

  const update = (key: string, index: number, change: (item: Item) => Item) => {
    const list = entriesRef.current[key];
    if (!list?.[index]) return;
    const next = list.map((item, at) => at === index ? change(item) : item);
    store({...entriesRef.current, [key]: next});
  };
  const taskOf = (key: string) => key.slice(0, key.indexOf(':'));

  const apply = (key: string, index: number) => update(key, index, item => {
    const scope = envRef.current.scopeNow();
    if (item.state !== 'offered' || item.reason !== 'narrow') return item;
    if (!sameScope(item.scope, scope)) return {...item, state: 'skipped', reason: 'stale'};
    return perform(taskOf(key), item.action, scope, true);
  });

  const undo = (key: string, index: number) => update(key, index, item => {
    const host = envRef.current, taskId = taskOf(key);
    if (item.state !== 'applied' || !item.undo) return item;
    const status = undoStatus(item.undo, currentView(taskId, item), host.scopeNow());
    // A refused Undo re-renders the row as disabled; nothing is restored.
    if (!status.ok) return {...item};
    const {action} = item, restore = status.restore;
    if (action.action === 'open_work_area') host.restoreView(restore);
    else if (action.action === 'expand_process') {
      storeOpen(openKey(taskId, action.turnId), Boolean(restore.processOpen));
    } else if (action.action === 'scroll_to_turn') {
      if (item.viewport) item.viewport.scrollTop = Number(restore.scrollTop);
    } else storePlaceholder(null);
    return {...item, state: 'undone', undo: undefined, viewport: undefined};
  });

  const rows = (taskId: string, turnId?: string): ActionRow[] => {
    const key = `${taskId}:${turnId}`;
    return (turnId ? entries[key] ?? [] : []).flatMap((item, index): ActionRow[] => {
      const text = describeAction(item.action, item.state, item.reason);
      if (!text) return [];
      // A live narrow-screen offer is news too; a history offer is not.
      const announce = ANNOUNCED.includes(item.state)
        || (item.state === 'offered' && item.reason === 'narrow');
      const row: ActionRow = {key: `${key}:${index}`, text, announce};
      if (item.state === 'applied' && item.undo) {
        const status = undoStatus(item.undo, currentView(taskId, item), env.scopeNow());
        row.button = {
          label: 'Undo', disabled: !status.ok, note: status.ok ? undefined : 'View changed since',
          onClick: () => undo(key, index),
        };
      } else if (item.state === 'offered' && item.reason === 'narrow') {
        row.button = {label: actionButtonLabel(item.action), onClick: () => apply(key, index)};
      }
      return [row];
    });
  };

  return {
    rows, offer, enabled: env.enabled,
    processOpen: (taskId, turnId) => open[openKey(taskId, turnId)] ?? false,
    setProcessOpen: (taskId, turnId, value) => storeOpen(openKey(taskId, turnId), value),
    placeholder:
      placeholder && sameScope(placeholder.scope, env.scopeNow()) ? placeholder.text : null,
    dismissPlaceholder: () => { if (placeholderRef.current) storePlaceholder(null); },
  };
}

/** Per-turn host: once the completion proof verifies, hands the turn actions to the controller. */
export function DisplayActionsTurn(props: {
  api?: DisplayActionsApi; taskId: string; turnId?: string; last: boolean; text: string;
  completion: unknown; actions: unknown; turnIds: string[];
}) {
  const {api, taskId, turnId, last, text, completion, actions, turnIds} = props;
  const offer = api?.offer, ids = turnIds.join('\n');
  useEffect(() => {
    if (!offer || !turnId || !completion || actions === undefined) return;
    let current = true;
    void verifyAnswerCompletionHash(completion as {answerHash: string}, text).then(ok => {
      if (!current || !ok) return;
      const proof = completion as {completionSequence?: number};
      const known = ids ? ids.split('\n') : [];
      offer({taskId, turnId, completion: proof, value: actions, last, turnIds: known});
    });
    return () => { current = false; };
  }, [offer, taskId, turnId, last, text, completion, actions, ids]);
  return null;
}
