'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { markReviewOpened } from '@/lib/work-modes.mjs';
import { drawingTitle } from '@/lib/drawing-presentation.mjs';
import type { WorkAreaActions, WorkScope } from '@/lib/work-area-contract';
import { Button } from '../ui/button';
import { ReviewDecision } from './review-decision';
import type { WorkspaceState } from './use-workspace-state';
import styles from './review-screen.module.css';

const svgSrc = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const packageHref = (taskId: string, plan: {planId: string; version: number}) =>
  `/revision-package?${new URLSearchParams({task: taskId, plan: plan.planId, version: String(plan.version)})}`;

/**
 * One screen for the current task and plan version: what changed, checks, assumptions, decision.
 * Opening it unlocks Accept and Approve for this version in memory; it never approves anything.
 */
export function ReviewScreen({w, scope, version, locked, checks, actions}: {
  w: WorkspaceState; scope: WorkScope; version: string; locked: boolean; checks: ReactNode; actions: WorkAreaActions;
}) {
  const {run, designVersion, compareVersion, designDiff, comparisonKind, comparisonLoading, comparisonError, drawingCurrent, drawingLoading} = w;
  const taskId = run && run.id === scope.taskId ? run.id : null;
  const design = taskId ? run?.data.agent_design : undefined;
  useEffect(() => { markReviewOpened(taskId, version); }, [taskId, version]);
  // Ask once per version for the parent version and its diff; the Try again button asks again.
  const asked = useRef('');
  const key = designVersion ? `${designVersion.planId}:${designVersion.version}:${designVersion.fingerprint}` : '';
  const wantsParent = Boolean(design && designVersion && designVersion.version > 1);
  useEffect(() => {
    if (!wantsParent || !drawingCurrent || drawingLoading || asked.current === key) return;
    asked.current = key;
    void w.compareDrawing('previous');
  }, [wantsParent, drawingCurrent, drawingLoading, key]);
  if (!taskId || !run) return <div className={styles.screen}><p className={styles.note}>Nothing to review yet. Open a chat to review its plan here.</p></div>;
  const hasDecision = Boolean(design || run.status === 'awaiting_approval' || run.data.error === 'APPROVAL_REQUIRED');
  const title = designVersion ? drawingTitle(designVersion, design?.candidates) : run.title;
  const before = comparisonKind === 'previous' ? compareVersion : null;
  const pick = (v: { svg: string; lineworkSvg?: string }) => svgSrc(v.lineworkSvg ?? v.svg);
  return <div className={styles.screen} role="region" aria-label="Review">
    <header><h2>Review</h2><p className={styles.sub}>{title}</p>
      {design && designVersion && <a className={styles.package} href={packageHref(taskId, designVersion)} target="_blank" rel="noopener">Revision package<span className={styles.sr}> (opens in a new tab)</span></a>}
    </header>
    {!hasDecision && <p className={styles.note}>There is no plan or proposal to review in this chat yet.</p>}
    {design && <section className={styles.section} aria-labelledby="review-changed">
      <h3 id="review-changed">What changed</h3>
      {!designVersion ? <p className={styles.note} role="status">{drawingLoading ? 'Loading the drawing…' : 'The drawing is not available yet.'}</p>
        : designVersion.version <= 1 ? <p className={styles.note}>This is the first version, so there is nothing to compare it with yet.</p>
        : <>
          {comparisonLoading && <p className={styles.note} role="status">Loading the earlier version…</p>}
          {comparisonError && <div role="alert"><p className={styles.error}>The earlier version could not be loaded: {comparisonError}</p>
            <Button variant="secondary" onClick={() => void w.compareDrawing('previous')}>Try again</Button></div>}
          {before && <>
            <div className={styles.pair}>
              <figure className={styles.figure}><figcaption>Before · Version {before.version}</figcaption><img src={pick(before)} alt={`Plan before the change, version ${before.version}`} /></figure>
              <figure className={styles.figure}><figcaption>After · Version {designVersion.version}</figcaption><img src={pick(designVersion)} alt={`Plan after the change, version ${designVersion.version}`} /></figure>
            </div>
            {designDiff && <p className={styles.summary} role="status">{designDiff}</p>}
          </>}
        </>}
    </section>}
    {design && <section className={styles.section} aria-labelledby="review-checks"><h3 id="review-checks">Checks</h3>{checks}</section>}
    {design && <section className={styles.section} aria-labelledby="review-assumptions">
      <h3 id="review-assumptions">Assumptions</h3>
      {w.reviewAssumptions.length ? <ul className={styles.list}>{w.reviewAssumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
        : <p className={styles.note}>No assumptions were reported for this plan.</p>}
    </section>}
    {hasDecision && <section className={styles.section} aria-labelledby="review-decision">
      <h3 id="review-decision">Decision</h3>
      <ReviewDecision w={w} locked={locked} actions={actions} />
    </section>}
  </div>;
}
