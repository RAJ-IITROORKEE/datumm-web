// Synthetic stand-in for GET admin/feedback and its /case route. In-memory, no service.
type Vote = { rating: string; reason?: string };
const hours = (n: number) => new Date(Date.now() - n * 3600e3).toISOString();
const turn = (n: number) => `3f2b8c1e-9a4d-4e6f-8b2a-${String(n).padStart(12, '0')}`;
const SEED = [
  { n: 1, vote: 'down', reason: 'inaccurate', age: 2, model: 'openai/gpt-6-luna', owner: 'a1b2c3d4e5f60718' },
  { n: 2, vote: 'down', reason: 'too_long', age: 6, model: 'openai/gpt-6.1-sol', owner: 'b1c2d3e4f5061728' },
  { n: 3, vote: 'up', reason: null, age: 8, model: 'openai/gpt-6-luna', owner: 'a1b2c3d4e5f60718' },
  { n: 4, vote: 'down', reason: 'incomplete', age: 30, model: 'openai/gpt-6-luna', owner: null },
  { n: 5, vote: 'down', reason: 'inaccurate', age: 50, model: 'google/gemini-3-pro', owner: 'b1c2d3e4f5061728' },
];
const PAGE = 3;

function rows(votes: Record<string, Vote>, taskId: string, liveTurn: string) {
  const live = Object.entries(votes).filter(([id]) => id === liveTurn).map(([id, vote]) => ({
    id: `${taskId}:${id}`, vote: vote.rating, reason: vote.rating === 'down' ? vote.reason ?? null : null,
    createdAt: hours(0), model: 'openai/gpt-6-luna', ownerHash: 'a1b2c3d4e5f60718', taskId }));
  return [...live, ...SEED.map(s => ({ id: `fixture-other:${turn(s.n)}`, vote: s.vote, reason: s.reason,
    createdAt: hours(s.age), model: s.model, ownerHash: s.owner, taskId: 'fixture-other' }))];
}

export function fixtureFeedback(query: URLSearchParams, votes: Record<string, Vote> = {},
  taskId = 'fixture-task', liveTurn = '') {
  const all = rows(votes, taskId, liveTurn)
    .filter(row => !query.get('vote') || row.vote === query.get('vote'))
    .filter(row => !query.get('reason') || row.reason === query.get('reason'));
  const start = Number(query.get('before')?.replace(/^o/, '')) || 0;
  return { schemaVersion: 1, rows: all.slice(start, start + PAGE),
    nextBefore: start + PAGE < all.length ? `o${start + PAGE}` : null };
}

export function fixtureCase(id: string, votes: Record<string, Vote> = {}, taskId = 'fixture-task',
  liveTurn = '') {
  const row = rows(votes, taskId, liveTurn).find(item => item.id === id);
  if (!row) return null;
  return { prompt: 'How large is the kitchen? (Illustrative text.)',
    answerExcerpt: 'The kitchen is 12 m². Illustrative text, not a Revit measurement.',
    expected: null, reason: row.reason, vote: row.vote, model: row.model, createdAt: row.createdAt };
}
