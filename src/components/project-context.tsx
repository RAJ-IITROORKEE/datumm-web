'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import type { ProjectRow, Run } from './workspace/use-workspace-state';
import { projectBrief, provenanceLabel } from '@/lib/project-brief.mjs';
import { hasPendingQuestion } from '@/lib/workflow-state';
import styles from './project-context.module.css';
import { ProjectBriefEditor, useProjectBriefEditor } from './project-brief-editor';

type Props = {
  accountKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: Run | null;
  selectedTaskId: string | null;
  project: ProjectRow | null;
  onAmendDraft?: () => boolean | void;
  onUseBrief?: (text:string) => boolean | string | void;
};

export function ProjectContext({ accountKey, open, onOpenChange, run, selectedTaskId, project, onAmendDraft, onUseBrief }: Props) {
  const editor = useProjectBriefEditor(accountKey, project?.id, open);
  const draftClose = useRef(false);
  const usingBrief = useRef(false);
  if (!open) usingBrief.current = false;
  const opener = useRef<HTMLElement | null>(null);
  const brief = projectBrief(run, selectedTaskId, project);
  const pendingQuestion = Boolean(run && run.id === selectedTaskId && (hasPendingQuestion(run) || (run.data as {opencode_questions?: unknown[]}).opencode_questions?.length));
  const taskSettled = Boolean(run && ['completed','failed','cancelled','interrupted'].includes(run.status));
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={styles.dialog} onOpenAutoFocus={() => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }} onCloseAutoFocus={event => {
      if (draftClose.current) { event.preventDefault(); draftClose.current = false; }
      else {
        event.preventDefault();
        const target = opener.current;
        if (target?.isConnected && target.getClientRects().length && !target.closest('[hidden],[inert]')) target.focus();
        else {
          const composer = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]');
          if (composer?.getClientRects().length && !composer.closest('[hidden],[inert]')) composer.focus();
        }
      }
    }}>
      <DialogHeader>
        <DialogTitle>Project context</DialogTitle>
        <DialogDescription>Project brief and recorded context from the selected task.</DialogDescription>
      </DialogHeader>
      <div className={styles.body}>
        <ProjectBriefEditor editor={editor} projectId={project?.id} projectTitle={project?.title} task={run && run.id === selectedTaskId ? run : null} onUseBrief={onUseBrief ? text => { if (usingBrief.current) return false; usingBrief.current = true; const result = onUseBrief(text); if (result === false || typeof result === 'string') { usingBrief.current = false; return result; } draftClose.current = true; onOpenChange(false); return true; } : undefined} useBlocked={pendingQuestion || Boolean(run && !taskSettled)} />
        <h3 className={styles.taskHeading}>Selected task context</h3>
        {brief.state === 'no-task' && <p className={styles.empty}>Select a task to see its recorded brief and decisions.</p>}
        {brief.state === 'project-mismatch' && <p className={styles.empty}>This task does not match the selected project. Refresh or select the task again to view its context.</p>}
        {brief.state === 'ready' && <>
          <div className={styles.identity}>
            <div><span>Project</span><strong>{brief.association === 'matched' ? brief.projectTitle : brief.association === 'unavailable' ? 'Project details unavailable' : 'Association not recorded'}</strong></div>
            <div><span>Task</span><strong>{brief.taskTitle}</strong></div>
          </div>
          {brief.sections.length === 0 && <p className={styles.empty}>No brief or decisions were recorded for this task.</p>}
          {brief.sections.map(section => {
            if (section.kind === 'interpretation') return <section className={styles.section} key={section.kind}>
              <h3>Task interpretation</h3><p className={styles.hint}>Values reflect the task interpretation; confirmation is not established.</p>
              {section.values.length > 0 && <dl className={styles.values}>{section.values.map((item, i) => <div key={i}><dt>{item.label}</dt><dd>{item.value} · {provenanceLabel(item.provenance)}</dd></div>)}</dl>}
              {section.assumptions.length > 0 && <><h4>Assumptions</h4><ul>{section.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
              {section.unresolved.length > 0 && <><h4>Unresolved</h4><ul>{section.unresolved.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
              {section.deferred.length > 0 && <><h4>Deferred</h4><ul>{section.deferred.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
              <details className={styles.details}><summary>Interpretation source details</summary><p>Recorded status: {section.status || 'not recorded'}</p>{section.values.filter(item => item.provenance || item.sourceText).map((item, i) => <p key={i}>{item.label}: {item.provenance}{item.sourceText ? ` · ${item.sourceText}` : ''}</p>)}{section.sourceOnly.map((item, i) => <p key={`source-${i}`}>Recorded {item.label.toLowerCase()}: {item.value}{item.provenance ? ` · ${item.provenance}` : ''}</p>)}<p>Status and provenance do not confirm individual values.</p></details>
            </section>;
            if (section.kind === 'handoff') return <section className={styles.section} key={section.kind}>
              <h3>Task handoff</h3>
              {section.goal && <><h4>Original goal</h4><p>{section.goal}</p></>}
              {section.nextAction && <><h4>Recorded next action</h4><p>{section.nextAction.replaceAll('_', ' ')}</p></>}
              {section.operations.length > 0 && <p>Unresolved operations: {section.operations.length}. Review the original operation records before continuing.</p>}
              <details className={styles.details}><summary>Handoff source details</summary><p>Handoff version: {section.version || 'not recorded'} · schema: {section.schemaVersion || 'not recorded'}</p><p>Document: {section.documentId || 'not recorded'} · revision: {section.revision || 'not recorded'}</p></details>
            </section>;
            return <section className={styles.section} key={section.kind}>
              <h3>Accepted for a plan</h3><p className={styles.hint}>These assumptions were accepted for the recorded plan only. {section.relation === 'different' ? 'That plan differs from the current plan.' : section.relation === 'unknown' ? 'The current plan relationship is unknown.' : 'The recorded identity matches the current plan.'}</p>
              <ul>{section.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul>
              <details className={styles.details}><summary>Plan source details</summary><p>Plan: {section.planId} · version {section.version}</p><p>Fingerprint: {section.fingerprint}</p></details>
            </section>;
          })}
          <details className={styles.details}><summary>Task source details</summary><p>Task: {brief.taskId}</p><p>Project association: {brief.projectId || 'not recorded'}</p><p>Task version: {brief.taskVersion || 'not recorded'} · event cursor: {brief.eventCursor || 'not recorded'}</p><p>These identifiers describe the snapshot, not the age of each field. Freshness and completeness have not been established.</p></details>
        </>}
      </div>
      {brief.state === 'ready' && onAmendDraft && <div className={styles.actions}><button type="button" className={styles.action} disabled={pendingQuestion || !taskSettled} onClick={() => { if (pendingQuestion || !taskSettled || onAmendDraft() === false) return; draftClose.current = true; onOpenChange(false); }}>Draft an update</button><p>{pendingQuestion ? 'Answer the pending questions before drafting a brief update.' : !taskSettled ? 'Finish this task before drafting a brief update.' : 'Adds an unsent composer draft. It does not update these records.'}</p></div>}
    </DialogContent>
  </Dialog>;
}
