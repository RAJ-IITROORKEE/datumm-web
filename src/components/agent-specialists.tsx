'use client';

import styles from './agent-specialists.module.css';

export type SpecialistResult = {
 schemaVersion: 1;
 role: string;
 status: 'completed' | 'partial' | 'failed' | 'cancelled' | 'stale';
 findings: { severity: 'info' | 'concern' | 'unknown'; message: string; evidenceRefs: string[] }[];
 artifactRefs: string[];
 nativeAuthority: 'none';
};

export function AgentSpecialists({ results, taskId, onOpenArtifact }: { results?: SpecialistResult[]; taskId: string; onOpenArtifact?: (artifact: {taskId: string; sha256: string}, opener: HTMLElement) => void }) {
 if (!results?.length) return null;
 return <div className={styles.reviews} aria-label="Specialist review">
  {results.map((result, index) => <div className={styles.review} key={`${result.role}-${index}`}>
   <p className={styles.heading}><strong>{result.role.replaceAll('_', ' ')}</strong><span>{result.status}</span></p>
   {result.findings.map((finding, i) => <p className={styles.finding} key={i}>{finding.severity === 'unknown' ? 'Unknown: ' : ''}{finding.message}</p>)}
   {result.artifactRefs.map((ref,i) => result.role === 'report_preparer' && result.status === 'completed' && /^[a-f0-9]{64}$/.test(ref)
    ? onOpenArtifact ? <button type="button" key={`${ref}-${i}`} onClick={event => onOpenArtifact({taskId,sha256:ref},event.currentTarget)}>Download evidence report (JSON)</button>
      : <a key={`${ref}-${i}`} href={`/api/service/tasks/${encodeURIComponent(taskId)}/specialist-artifacts/${ref}`} download>Download evidence report (JSON)</a>
    : null)}
   {result.artifactRefs.some(ref => !(result.role === 'report_preparer' && result.status === 'completed' && /^[a-f0-9]{64}$/.test(ref))) && <details className={styles.source}><summary>Source details</summary>{result.artifactRefs.filter(ref => !(result.role === 'report_preparer' && result.status === 'completed' && /^[a-f0-9]{64}$/.test(ref))).map((ref, i) => <p key={`${ref}-${i}`}>Artifact reference: {ref} · Download unavailable</p>)}</details>}
  </div>)}
  <p className={styles.note}>Advisory findings do not approve a plan or a model change. Optional reviews may be unavailable.</p>
 </div>;
}
