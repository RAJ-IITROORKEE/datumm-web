// Approval mode and tool-approval card rules. The server enforces both; this only displays them
// and fails closed: anything unreadable is "ask". A Revit change never depends on any of this.
export const APPROVAL_MODES = ['ask', 'safe', 'auto'];
export const DEFAULT_APPROVAL_MODE = 'ask';
const RISKS = ['read', 'external', 'device', 'write'];

export const parsePermissions = raw => ({
  approvalMode: APPROVAL_MODES.includes(raw?.approvalMode) ? raw.approvalMode : DEFAULT_APPROVAL_MODE,
});
export const permissionsBody = mode => (APPROVAL_MODES.includes(mode) ? { approvalMode: mode } : null);

export const APPROVAL_CARDS = [
  { id: 'ask', title: 'Ask before acting', description: 'DATUMM asks before it uses an outside service or a tool that changes something. This is the default.' },
  { id: 'safe', title: 'Safe', description: 'DATUMM asks before outside services and runs tools that change things without asking.' },
  { id: 'auto', title: 'Full auto', description: 'DATUMM runs outside services without asking. Revit changes still need your approval of the exact proposal.' },
];
export const ALWAYS_ASKS = [
  { title: 'Revit model changes', description: 'Every change needs your approval of the exact proposal, or a task access grant you set for that proposal.' },
  { title: 'New kinds of tools', description: 'A tool DATUMM does not recognise is treated as a change and asks first.' },
];

const toMs = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : null;
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? null : ms;
};

/** Null unless the record is a tool approval offering both answers; then the plain card is used. */
export function parseApproval(question) {
  if (question?.kind !== 'tool_approval') return null;
  const item = question.questions?.[0];
  const ids = Array.isArray(item?.options) ? item.options.map(o => o?.id) : [];
  if (typeof item?.id !== 'string' || !ids.includes('allow_once') || !ids.includes('deny')) return null;
  return {
    risk: RISKS.includes(question.risk) ? question.risk : null, expiresAt: toMs(question.expiresAt),
    toolName: typeof question.call?.name === 'string' ? question.call.name : null,
    itemId: item.id, allowId: 'allow_once', denyId: 'deny',
  };
}

/** The reply uses the ids the server sent, never option positions (a wrong id is a 409). */
export const approvalAnswers = (approval, choice) => [
  { question_id: approval.itemId, option_id: choice === 'allow' ? approval.allowId : approval.denyId },
];

// serverExpired is the run's agent_approval_expired flag, set after a late reply got a 409.
export function approvalStatus(approval, now, serverExpired = false) {
  if (serverExpired) return { expired: true, label: 'Expired' };
  if (approval.expiresAt === null) return { expired: false, label: '' };
  const left = approval.expiresAt - now;
  if (left <= 0) return { expired: true, label: 'Expired' };
  return { expired: false, label: left >= 60000 ? `Expires in ${Math.ceil(left / 60000)} min` : `Expires in ${Math.ceil(left / 1000)} s` };
}

// Screen readers hear the countdown only when it crosses 5 min, 1 min and expiry, never every tick.
export function approvalAnnouncement(approval, now, serverExpired = false) {
  if (approvalStatus(approval, now, serverExpired).expired) return 'This approval expired.';
  if (approval.expiresAt === null) return '';
  const left = approval.expiresAt - now;
  return left <= 60000 ? 'This approval expires in 1 minute.' : left <= 300000 ? 'This approval expires in 5 minutes.' : '';
}
