import type { AdminConfig } from '@/lib/admin-config.mjs';

// In-memory stand-in for the A2 backend: full snapshots per revision, a masked diff, a restore
// that appends, and an audit list with `at|seq` cursors. Synthetic data only.
type Change = {
  path: string; before?: unknown; after?: unknown;
  beforeHash: string | null; afterHash: string | null;
};
type Entry = {
  revision: number; at: string; by: string; action: 'update' | 'restore' | 'baseline';
  restoredFrom: number | null; note: string | null; config: AdminConfig; changes: Change[];
  recovered: boolean; redacted: boolean; restorable: boolean;
};
type AuditRow = Record<string, unknown> & { cursor: string; kind: string };

const SHOWN = new RegExp('^(models|defaultModel|defaultReasoningEffort|runUsdLimit|parallelChats'
  + '|limits\\..+|webSearch\\..+|skills\\[[^\\]]+\\]\\.(name|modes|enabled)'
  + '|mcpServers\\[[^\\]]+\\]\\.(name|enabled))$');
const ITEM = /^((?:skills|mcpServers)\[[^\]]+\])\./;
const stable = (value: unknown) => JSON.stringify(value) ?? 'null';
const hash = (value: unknown) => {
  const text = stable(value);
  let a = 5381, b = 52711;
  for (const char of text) {
    const code = char.charCodeAt(0);
    a = (a * 33 ^ code) >>> 0; b = (b * 31 + code) >>> 0;
  }
  return (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')).slice(0, 12);
};

function flatten(config: AdminConfig) {
  const flat: Record<string, unknown> = {
    models: config.models, defaultModel: config.defaultModel,
    defaultReasoningEffort: config.defaultReasoningEffort, runUsdLimit: config.runUsdLimit,
    parallelChats: config.parallelChats,
    'webSearch.enabled': config.webSearch.enabled,
    'webSearch.includeDomains': config.webSearch.includeDomains,
    'webSearch.maxResults': config.webSearch.maxResults,
  };
  for (const [key, value] of Object.entries(config.limits ?? {})) flat[`limits.${key}`] = value;
  for (const skill of config.skills) {
    for (const key of ['name', 'description', 'instructions', 'modes', 'enabled'] as const) {
      flat[`skills[${skill.id}].${key}`] = skill[key];
    }
  }
  for (const server of config.mcpServers) {
    for (const key of ['name', 'url', 'toolAllowlist', 'enabled'] as const) {
      flat[`mcpServers[${server.id}].${key}`] = server[key];
    }
  }
  return flat;
}

/** Changed paths; values only for the safe list, hashes for free text and added/removed items. */
export function diffConfig(from: AdminConfig, to: AdminConfig): Change[] {
  const a = flatten(from), b = flatten(to), done = new Set<string>(), out: Change[] = [];
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (stable(a[path]) === stable(b[path]) && (path in a) === (path in b)) continue;
    const item = path.match(ITEM)?.[1];
    const added = item && !Object.keys(a).some(key => key.startsWith(`${item}.`));
    const removed = item && !Object.keys(b).some(key => key.startsWith(`${item}.`));
    if (item && (added || removed)) {
      if (done.has(item)) continue;
      done.add(item);
      out.push({ path: item, beforeHash: removed ? hash(item) : null,
        afterHash: added ? hash(item) : null });
      continue;
    }
    const change: Change = { path, beforeHash: hash(a[path]), afterHash: hash(b[path]) };
    if (SHOWN.test(path)) { change.before = a[path]; change.after = b[path]; }
    out.push(change);
  }
  return out.slice(0, 50);
}

const NOW = Date.parse('2026-11-12T06:00:00Z');
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3600_000).toISOString();

export function createHistoryFixture(live: AdminConfig, revision: number, by: string) {
  let seq = 0;
  const entries: Entry[] = [];
  const audit: AuditRow[] = [];
  const addAudit = (row: Record<string, unknown>, kind: string) => {
    const stamp = String(row.at);
    audit.unshift({ ...row, kind, cursor: `${stamp}|${String(++seq).padStart(6, '0')}` });
  };
  const configAt = (r: number): AdminConfig => {
    const config = structuredClone(live);
    if (r === revision - 5) return config; // Same as live: shows the disabled Restore state.
    config.parallelChats = ((revision - r) + 2) % 5 + 1;
    if (r < 6) {
      config.models = [live.models[1] ?? live.models[0]];
      config.defaultModel = config.models[0];
    }
    if (r >= 8 && r < revision) {
      config.skills = [{ id: 'fixture-skill', name: 'Fixture skill',
        description: 'Synthetic skill.',
        instructions: `Synthetic instructions, revision ${r}.`, modes: ['ask'], enabled: r !== 9 }];
    }
    return config;
  };
  const push = (entry: Entry) => {
    entries.push(entry);
    addAudit({
      at: entry.at, by: entry.by, summary: `Updated config: revision ${entry.revision}`,
      action: entry.action, revision: entry.revision, changes: entry.changes,
      changesTruncated: false, restoredFrom: entry.restoredFrom, note: entry.note,
    }, 'config');
  };
  for (let r = 1; r <= revision; r++) {
    const config = r === revision ? structuredClone(live) : configAt(r);
    push({
      revision: r, at: at((revision - r) * 5 + 1), by, action: r === 1 ? 'baseline' : 'update',
      restoredFrom: null, note: null, config, recovered: r === 1, redacted: r === 3,
      restorable: r !== 3, changes: r === 1 ? [] : diffConfig(entries[r - 2].config, config),
    });
  }
  for (let n = 1; n <= 14; n++) {
    addAudit({ at: at(70 - n), by, summary: `Added knowledge source fixture-${n}`,
      action: 'add' }, 'knowledge');
  }
  audit.sort((x, y) => (x.cursor < y.cursor ? 1 : -1));

  const latest = () => entries[entries.length - 1];
  const identical = (entry: Entry) => stable(entry.config) === stable(latest().config);
  const row = (entry: Entry) => {
    const { config: _config, ...rest } = entry;
    return { ...rest, identical: identical(entry) };
  };
  const find = (r: number) => entries.find(entry => entry.revision === r);
  const record = (config: AdminConfig, action: Entry['action'], restoredFrom: number | null,
    note: string) => {
    const previous = latest();
    push({ revision: previous.revision + 1, at: new Date().toISOString(), by, action,
      restoredFrom, note: note || null, config: structuredClone(config), recovered: false,
      redacted: false, restorable: true, changes: diffConfig(previous.config, config) });
  };
  return {
    current: () => entries[entries.length - 1].revision,
    find,
    list(before: number | null, limit: number) {
      const older = entries.filter(entry => before === null || entry.revision < before).reverse();
      const page = older.slice(0, limit);
      return { schemaVersion: 1, current: this.current(), rows: page.map(row),
        nextBefore: older.length > limit ? page[page.length - 1].revision : null };
    },
    detail(r: number) {
      const entry = find(r);
      return entry && { ...row(entry), config: entry.config,
        changesFromCurrent: diffConfig(latest().config, entry.config),
        changesFromCurrentTruncated: false };
    },
    record,
    /** Backend order: 409 stale, 404 unknown, 422 not restorable, 422 already current. */
    restore(fromRevision: number, expectedRevision: number, note: string) {
      const entry = find(fromRevision);
      if (expectedRevision !== latest().revision) {
        return { ok: false as const, reason: 'stale' as const,
          message: 'Synthetic conflicting revision.' };
      }
      if (!entry) {
        return { ok: false as const, reason: 'missing' as const, message: 'Unknown revision.' };
      }
      if (!entry.restorable) {
        return { ok: false as const, reason: 'error' as const,
          message: 'This revision contains data that cannot be restored.' };
      }
      if (identical(entry)) {
        return { ok: false as const, reason: 'error' as const, message: 'Already current.' };
      }
      record(entry.config, 'restore', entry.revision, note);
      return { ok: true as const, data: structuredClone(entry.config) };
    },
    addKnowledge(title: string) {
      addAudit({ at: new Date().toISOString(), by, summary: `Added knowledge source ${title}`,
        action: 'add' }, 'knowledge');
    },
    audit(params: URLSearchParams) {
      if (!params.has('limit')) {
        return audit.slice(0, 100)
          .map(({ at: when, by: who, summary }) => ({ at: when, by: who, summary }));
      }
      const kind = params.get('kind'), before = params.get('before');
      const rows = audit.filter(item => !kind || item.kind === kind);
      const start = before ? rows.findIndex(item => item.cursor === before) + 1 : 0;
      return rows.slice(start, start + Number(params.get('limit')));
    },
  };
}
