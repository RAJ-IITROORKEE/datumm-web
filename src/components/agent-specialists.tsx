'use client';

export type SpecialistResult = {
 schemaVersion: 1;
 role: string;
 status: 'completed' | 'partial' | 'failed' | 'cancelled' | 'stale';
 findings: { severity: 'info' | 'concern' | 'unknown'; message: string; evidenceRefs: string[] }[];
 artifactRefs: string[];
 nativeAuthority: 'none';
};

export function AgentSpecialists({ results, taskId }: { results?: SpecialistResult[]; taskId: string }) {
 if (!results?.length) return null;
 return <div className="saved-plan-card" aria-label="Specialist review">
  <div className="section-caption">SPECIALIST REVIEW<span>Advisory</span></div>
  {results.map((result, index) => <div key={`${result.role}-${index}`}>
   <p><strong>{result.role.replaceAll('_', ' ')}</strong> · {result.status}</p>
   {result.findings.map((finding, i) => <p key={i}>{finding.severity === 'unknown' ? 'Unknown: ' : ''}{finding.message}</p>)}
   {result.role === 'report_preparer' && result.status === 'completed' && result.artifactRefs.map(ref => <a key={ref} href={`/api/service/tasks/${taskId}/specialist-artifacts/${ref}`} download>Download evidence report (JSON)</a>)}
  </div>)}
  <small>Optional reviews may be unavailable. Findings do not approve a plan or a model change.</small>
 </div>;
}
