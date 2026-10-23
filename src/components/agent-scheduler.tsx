'use client';

export type SchedulerView = {
 schemaVersion: 1;
 steps: { stepId: string; status: string; requiredFields?: string[] }[];
 wait?: { affectedFields: string[]; affectedSteps: string[] } | null;
 steeringPending: boolean;
 results: Record<string, { role: string; facts: Record<string, unknown>; findings: string[]; nativeAuthority: 'none' }>;
};

export function AgentScheduler({ value }: { value?: SchedulerView | null }) {
 if (!value) return null;
 return <div className="saved-plan-card" aria-label="Background work">
  <div className="section-caption">BACKGROUND WORK<span>{value.steeringPending ? 'Updating inputs' : value.wait ? 'Question pending' : 'Inputs tracked'}</span></div>
  {value.steps.map(step => <p key={step.stepId}>{step.stepId.replaceAll('_', ' ')}: {step.status}{step.status === 'blocked' && step.requiredFields?.length ? ` · waiting for ${step.requiredFields.map(f => f.replaceAll('_', ' ')).join(', ')}` : ''}</p>)}
  {Object.values(value.results).map(result => <div key={result.role}>{result.findings.map(finding => <p key={finding}>{finding}</p>)}</div>)}
  <small>Background findings do not approve a design or a model change.</small>
 </div>;
}
