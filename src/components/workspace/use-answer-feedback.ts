import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from './use-workspace-state';
import type { AnswerFeedback } from '@/lib/work-area-contract';
import {
  applyFeedback, feedbackFailureMessage, feedbackPath, feedbackVotes, type FeedbackKind,
} from '@/lib/answer-feedback.mjs';

type Loaded = { taskId: string; votes: Record<string, FeedbackKind> };

/**
 * Answer ratings for the open task, or undefined when the backend does not report `feedback`.
 * Votes load once per task so a reload shows the saved thumb; a failed save is announced, never
 * recorded as saved, and its notice is withdrawn by the next successful save.
 */
export function useAnswerFeedback(
  enabled: boolean, taskId: string | null, announce: Dispatch<SetStateAction<string>>,
): AnswerFeedback | undefined {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const failure = useRef('');
  useEffect(() => {
    if (!enabled || !taskId) return;
    let live = true;
    // An unreadable list leaves the thumbs neutral instead of hiding them.
    api<unknown>(feedbackPath(taskId))
      .then(rows => ({ taskId, votes: feedbackVotes(rows) }), () => ({ taskId, votes: {} }))
      .then(next => { if (live) setLoaded(next); });
    return () => { live = false; };
  }, [enabled, taskId]);
  const votes = loaded && loaded.taskId === taskId ? loaded.votes : null;
  return useMemo(() => enabled ? {
    votes,
    async save(target, body) {
      try {
        await api(feedbackPath(target), 'POST', body);
      } catch (error) {
        failure.current = feedbackFailureMessage((error as { status?: number }).status);
        announce(failure.current);
        return false;
      }
      setLoaded(current => current?.taskId === target
        ? { taskId: target, votes: applyFeedback(current.votes, body) } : current);
      // Clear only our own notice; a newer message from elsewhere stays.
      const shown = failure.current;
      failure.current = '';
      if (shown) announce(current => current === shown ? '' : current);
      return true;
    },
  } : undefined, [enabled, votes, announce]);
}
