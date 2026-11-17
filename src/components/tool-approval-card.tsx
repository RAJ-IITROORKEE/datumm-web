'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RISK_LABELS } from '@/lib/admin-tools.mjs';
import { approvalAnnouncement, approvalAnswers, approvalStatus, type ToolApproval } from '@/lib/permissions.mjs';
import type { AgentQuestion, ReplyPayload } from './agent-questions';
import styles from './question-card.module.css';

type Reply = (payload: ReplyPayload | { question_id: string; answer: string }) => Promise<void>;

/** Approval for one tool call. It never authorizes a Revit change; that has its own exact card. */
export function ToolApprovalCard({ question, approval, expired = false, onReply }: { question: AgentQuestion; approval: ToolApproval; expired?: boolean; onReply: Reply }) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lapsed, setLapsed] = useState(false);
  const sending = useRef(false);
  const status = approvalStatus(approval, now, expired || lapsed);
  useEffect(() => {
    if (approval.expiresAt === null || status.expired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [approval.expiresAt, status.expired]);

  const answer = async (choice: 'allow' | 'deny') => {
    if (sending.current || status.expired) return;
    sending.current = true; setPending(true); setError('');
    try {
      await onReply({ question_id: question.id, question_version: question.version ?? 1, answers: approvalAnswers(approval, choice) });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Unable to send. Try again.';
      // A late reply gets a 409 "expired"; keep the buttons off instead of inviting a retry.
      if (/expired/i.test(message)) setLapsed(true); else setError(message);
      sending.current = false; setPending(false);
    }
  };
  const disabled = pending || status.expired;
  return (
    <section className={styles.card} aria-label="DATUMM asks to use a tool">
      <header className={styles.heading}>
        <ShieldQuestion size={16} aria-hidden="true" />
        <h3>DATUMM asks to use a tool</h3>
        {approval.risk && <Badge variant={approval.risk === 'read' ? 'secondary' : 'outline'}>{RISK_LABELS[approval.risk]}</Badge>}
      </header>
      <p className={styles.reason}>{question.question}</p>
      {status.label && <p className={styles.reason}>{status.label}</p>}
      <p role="status" className="sr-only">{approvalAnnouncement(approval, now, expired || lapsed)}</p>
      {status.expired && <p className={styles.error}>This approval expired. Send a new message and the agent will ask again.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.footer}>
        <small>{pending ? 'Sending your answer…' : 'This does not authorize Revit changes.'}</small>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => void answer('deny')}>Don't allow</Button>
          <Button type="button" disabled={disabled} onClick={() => void answer('allow')}>Allow once</Button>
        </span>
      </footer>
    </section>
  );
}
