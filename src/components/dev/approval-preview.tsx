'use client';

import { useMemo, useState } from 'react';
import { AgentQuestions, type AgentQuestion } from '../agent-questions';

type Scenario = 'pending' | 'soon' | 'expired' | 'unsupported' | 'send-error';
const LABELS: Record<Scenario, string> = {
  pending: 'Pending (15 min left)', soon: 'Pending (20 s left)', expired: 'Expired',
  unsupported: 'Backend without approvalModes', 'send-error': 'Reply fails',
};

export function ApprovalPreview() {
  const [scenario, setScenario] = useState<Scenario>('pending');
  const [answer, setAnswer] = useState('');
  const question = useMemo<AgentQuestion>(() => {
    const left = scenario === 'soon' ? 20_000 : scenario === 'expired' ? -60_000 : 15 * 60_000;
    return {
      id: 'fixture-approval', version: 1, kind: 'tool_approval', risk: 'external',
      question: 'Allow generate concept image (outside service): "A calm timber kitchen, morning light"?',
      call: { name: 'generate_concept_image' },
      questions: [{ id: 'approval', question: 'Allow?', reason: '', required: true, inputKind: 'text', unit: '', options: [
        { id: 'allow_once', label: 'Allow once', recommended: false, rationale: '' },
          { id: 'deny', label: "Don't allow", recommended: false, rationale: '' }] }],
      expiresAt: new Date(Date.now() + left).toISOString(),
    };
  }, [scenario]);
  const reply = async (payload: unknown) => {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (scenario === 'send-error') throw new Error('Synthetic send failure. Try again.');
    const option = (payload as { answers?: { option_id?: string }[] }).answers?.[0]?.option_id;
    setAnswer(option === 'allow_once' ? 'Allowed once (fixture)' : 'Not allowed (fixture)');
  };
  return (
    <section style={{ padding: 24, maxWidth: 640 }}>
      <label>Fixture state <select aria-label="Approval fixture state" value={scenario}
        onChange={event => { setScenario(event.target.value as Scenario); setAnswer(''); }}>
        {Object.entries(LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <div style={{ marginTop: 16 }}>
        {answer ? <p role="status">{answer}</p>
          : <AgentQuestions key={scenario} runId="fixture-run" question={question} approvals={scenario !== 'unsupported'} onReply={reply} />}
      </div>
    </section>
  );
}
