'use client';

import type {EvidenceNode} from '@/lib/chat-composition.mjs';
import {Button} from '@/components/ui/button';
import {useOutputWorkspace} from './output-workspace';
import styles from './evidence-card.module.css';

const number = (value: number) => value.toLocaleString(undefined, {maximumFractionDigits: 2});
const savedAt = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});

/** A saved report revision cited by an answer.
 * Every value was resolved by the server; all text is plain. */
export function EvidenceCard({node}: {node: EvidenceNode}) {
  const {openSavedReport} = useOutputWorkspace();
  const {ref, display} = node;
  const saved = new Date(display.createdAt);
  return <figure className={styles.card}>
    <figcaption className={styles.title}>Saved report revision {display.revisionNumber}</figcaption>
    <dl className={styles.facts}>
      <div><dt>Saved</dt>
        <dd><time dateTime={display.createdAt}>{savedAt.format(saved)}</time></dd></div>
      <div><dt>Source plan</dt>
        <dd>{display.planTitle || 'Untitled plan'} · version {display.planVersion}</dd></div>
      <div><dt>Rows</dt><dd>{number(display.rowCount)}</dd></div>
      <div><dt>Proposed rooms</dt><dd>{number(display.proposedRoomCount)}</dd></div>
      <div><dt>Proposed area</dt><dd>{number(display.proposedAreaM2)} m²</dd></div>
    </dl>
    <p className={styles.limit}>Proposed concept geometry · not measured Revit quantities</p>
    {openSavedReport && <Button type="button" variant="secondary" size="sm"
      aria-label={`Open revision ${display.revisionNumber}`}
      onClick={event => openSavedReport(
        {revisionId: ref.revisionId, contentHash: ref.contentHash}, event.currentTarget)}>
      Open revision
    </Button>}
  </figure>;
}
