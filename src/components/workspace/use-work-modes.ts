'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  reviewOpened, reviewVersionOf, subscribeReviewOpened, workStateFromSection, type WorkMode,
} from '@/lib/work-modes.mjs';
import type { Run } from './use-workspace-state';

/**
 * Design / Review mode for the current work scope, plus the Review gate for the open task version.
 * The mode resets to Design when the scope changes; nothing here is stored or sent anywhere.
 */
export function useWorkModes({scopeKey, run, section, previewActive}: {
  scopeKey: string; run: Run | null; section: string; previewActive: boolean;
}) {
  const [state, set] = useState<{key: string; mode: WorkMode}>({key: scopeKey, mode: 'design'});
  const mode = state.key === scopeKey ? state.mode : 'design';
  const setMode = useCallback((next: WorkMode) => set({key: scopeKey, mode: next}), [scopeKey]);
  // An opened answer or saved report is shown in the work area, which is Design.
  useEffect(() => { if (previewActive) setMode('design'); }, [previewActive, setMode]);
  const taskId = run?.id ?? null;
  const version = reviewVersionOf({planVersion: run?.currentPlanRef?.version, proposalHash: run?.data.proposal?.approvalHash});
  const opened = useSyncExternalStore(subscribeReviewOpened, () => reviewOpened(taskId, version), () => false);
  return {mode, setMode, taskId, version, reviewLocked: !opened, drawerOpen: workStateFromSection(section).drawer !== null};
}
