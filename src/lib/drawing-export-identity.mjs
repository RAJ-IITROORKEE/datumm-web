/** A concept name is usable only when the loaded candidate matches the captured drawing. */
export function exactConceptName(plan, candidates = []) {
 const match = candidates.find(candidate => candidate?.planId === plan?.planId && candidate?.version === plan?.version && candidate?.fingerprint === plan?.fingerprint && typeof plan?.fingerprint === 'string' && plan.fingerprint.length > 0);
 if (!match) return undefined;
 const ids = [...new Set(candidates.map(candidate => candidate?.planId).filter(id => typeof id === 'string' && id.trim()))];
 const index = ids.indexOf(plan.planId);
 return index < 0 ? undefined : `Concept ${index + 1}`;
}

/** A portable filename segment, bounded by UTF-8 bytes without splitting Unicode code points. */
export function safeDrawingSegment(value, fallback = 'drawing') {
 const normalized = typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/gu, '-').replace(/^[.\- ]+|[.\- ]+$/gu, '') : '';
 let result = '', bytes = 0;
 for (const char of normalized) {
  const size = new TextEncoder().encode(char).length;
  if (bytes + size > 80) break;
  result += char; bytes += size;
 }
 result = result.replace(/[.\- ]+$/gu, '');
 if (!result || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result)) return fallback;
 return result;
}

export function drawingExportName(plan, view, conceptName) {
 const name = conceptName || 'drawing';
 const planId = safeDrawingSegment(plan.planId, 'unknown');
 const version = Number.isSafeInteger(plan.version) && plan.version > 0 ? plan.version : 'unknown';
 return `datumm-${safeDrawingSegment(name)}-${planId}-v${version}-${view === '3d' ? '3d' : '2d'}`;
}
