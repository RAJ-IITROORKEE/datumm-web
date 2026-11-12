// Only composer text belongs here. Uploads, provider settings and auth tokens
// remain with their existing owners. A null account never accesses storage.
export const promptDraftLimits = Object.freeze({days: 7, drafts: 20, characters: 12000, totalCharacters: 96000});
const retentionMs = promptDraftLimits.days * 24 * 60 * 60 * 1000;
const validKey = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const persistable = text => text.length <= promptDraftLimits.characters && !/data:[^\s,]*;base64,|-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----|\bBearer\s+[A-Za-z0-9._~-]{16,}|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/i.test(text);
const sameRevision = (a, b) => !a || !b ? a === b : a.revision || b.revision ? a.revision === b.revision : a.text === b.text && a.updatedAt === b.updatedAt;
const revisionOf = row => row ? row.revision ?? JSON.stringify([row.updatedAt, row.text]) : undefined;
let editSequence = 0;
const newRevision = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${++editSequence}:${Math.random().toString(36).slice(2)}`;

export function createPromptDraftStore({accountKey = null, storage = () => null, now = Date.now} = {}) {
  const key = validKey(accountKey) ? 'datumm-prompt-drafts:v1:' + encodeURIComponent(accountKey) : null;
  const entries = new Map(), locallyAuthored = new Map();
  let observed = new Map(), status = key ? 'saved' : 'memory';

  const readStored = target => {
    const raw = target.getItem(key), result = new Map();
    if (!raw || raw.length > 600000) return result;
    let saved;
    try { saved = JSON.parse(raw); } catch { return result; }
    if (saved?.version !== 1 || !Array.isArray(saved.drafts)) return result;
    let total = 0;
    for (const row of saved.drafts.slice(0, promptDraftLimits.drafts)) {
      if (!row || !validKey(row.source) || typeof row.text !== 'string' || !row.text.trim() || !persistable(row.text) || !Number.isFinite(row.updatedAt) || row.updatedAt > now() + 60000 || now() - row.updatedAt >= retentionMs) continue;
      total += row.text.length;
      if (total <= promptDraftLimits.totalCharacters) result.set(row.source, {text: row.text, updatedAt: row.updatedAt, ...(typeof row.revision === 'string' && row.revision.length <= 128 ? {revision: row.revision} : {})});
    }
    return result;
  };
  const synchronize = disk => {
    // Refresh previously saved entries, while retaining unsaved/over-limit local
    // text. A different store may have edited or admitted any of these sources.
    for (const [source, row] of entries) {
      if (!observed.has(source) || !sameRevision(row, observed.get(source))) continue;
      if (disk.has(source)) entries.set(source, disk.get(source));
      else entries.delete(source);
    }
    for (const [source, row] of disk) if (!entries.has(source)) entries.set(source, row);
    observed = new Map(disk);
  };
  const persist = change => {
    if (!key) return status = 'memory';
    try {
      const target = storage();
      if (!target) return status = 'unavailable';
      // Start from the current disk snapshot, never the store's stale full map.
      // A mutation may affect only its own source (or the two keys of a move).
      const disk = readStored(target);
      synchronize(disk);
      change?.(disk);
      let total = 0;
      const drafts = [...disk].reverse().sort((a, b) => b[1].updatedAt - a[1].updatedAt).filter(([, row]) => now() - row.updatedAt < retentionMs && persistable(row.text)).slice(0, promptDraftLimits.drafts).filter(([, row]) => {
        if (total + row.text.length > promptDraftLimits.totalCharacters) return false;
        total += row.text.length;
        return true;
      }).map(([source, row]) => ({source, ...row}));
      if (drafts.length) target.setItem(key, JSON.stringify({version: 1, drafts}));
      else target.removeItem(key);
      observed = new Map(drafts.map(({source, ...row}) => [source, row]));
      return status = 'saved';
    } catch { return status = 'unavailable'; }
  };
  const sourceStatus = source => status === 'unavailable' ? status : !key || source && entries.has(source) && !sameRevision(entries.get(source), observed.get(source)) ? 'memory' : 'saved';
  // Loading also prunes expired disk records and incorporates the latest saved
  // edits without publishing any stale entries from another store instance.
  if (key) persist();
  return {
    get(source) { return entries.get(source)?.text ?? ''; },
    revision(source) { return revisionOf(entries.get(source)); },
    set(source, text) {
      if (!validKey(source) || typeof text !== 'string') return status;
      const row = text.trim() ? {text, updatedAt: now(), revision: newRevision()} : null;
      if (row) { entries.delete(source); entries.set(source, row); locallyAuthored.set(source, row.revision); }
      else { entries.delete(source); locallyAuthored.delete(source); }
      persist(disk => {
        if (row && persistable(text)) { disk.delete(source); disk.set(source, row); }
        else disk.delete(source);
        // synchronize() may have reloaded a record explicitly cleared above.
        if (row) entries.set(source, row);
        else entries.delete(source);
      });
      return sourceStatus(source);
    },
    // Both text and revision must belong to this request. A later edit with the
    // same text and timestamp is still a separate, unsubmitted draft.
    confirm(source, submittedText, submittedRevision) {
      const original = entries.get(source);
      const expectedRevision = submittedRevision ?? revisionOf(original);
      if (original?.text !== submittedText || revisionOf(original) !== expectedRevision) return sourceStatus(source);
      entries.delete(source);
      locallyAuthored.delete(source);
      persist(disk => {
        const current = disk.get(source);
        if (revisionOf(current) === expectedRevision) disk.delete(source);
        if (current && revisionOf(current) !== expectedRevision) entries.set(source, current);
        else entries.delete(source);
      });
      return sourceStatus(source);
    },
    // A newly admitted task replaces its provisional new-chat identity. Carry
    // only a newer unsent edit across that identity change, never another task.
    move(source, target) {
      if (!validKey(target) || source === target || !entries.has(source) || entries.has(target)) return sourceStatus(target);
      const original = entries.get(source), expected = observed.get(source);
      // Synchronization is not authorship: another editor's provisional draft
      // stays under its own source when this owner's earlier request completes.
      if (locallyAuthored.get(source) !== revisionOf(original)) return sourceStatus(target);
      entries.set(target, original);
      entries.delete(source);
      locallyAuthored.set(target, revisionOf(original));
      locallyAuthored.delete(source);
      persist(disk => {
        if (sameRevision(disk.get(source), expected) && !disk.has(target)) {
          disk.delete(source);
          if (persistable(original.text)) disk.set(target, original);
          entries.delete(source);
          entries.set(target, original);
        } else {
          // Another owner changed the source or destination; its disk text wins.
          if (disk.has(source)) entries.set(source, disk.get(source));
          else entries.delete(source);
          if (disk.has(target)) entries.set(target, disk.get(target));
          else entries.delete(target);
          locallyAuthored.delete(target);
          if (sameRevision(disk.get(source), original)) locallyAuthored.set(source, revisionOf(original));
        }
      });
      return sourceStatus(target);
    },
    status(source) { return sourceStatus(source); },
  };
}
