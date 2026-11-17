// Attachment chip rules. Images only: the hosted service has no attachment field yet, so the UI
// that uses this stays behind the `attachments` capability.
export const ATTACHMENT_LIMITS = Object.freeze({
  maxImages: 4, maxRawBytes: 1500000, maxEdgePx: 1568, maxInputBytes: 20000000,
});
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const kindOf = file => IMAGE_TYPES.includes(file?.type) ? 'image' : 'unsupported';

/** Splits incoming files into accepted ones and per-file refusals. Failed chips do not count. */
export function validateAttachments(existing, incoming) {
  let room = ATTACHMENT_LIMITS.maxImages - existing.filter(item => item.state !== 'error').length;
  const accepted = [], errors = [];
  for (const file of incoming) {
    const reason = kindOf(file) === 'unsupported' ? 'unsupported' : room <= 0 ? 'too_many' : null;
    if (reason) errors.push({name: file.name, reason});
    else { accepted.push(file); room--; }
  }
  return {accepted, errors};
}

export const addAttachments = (list, rows) =>
  [...list, ...rows.map(({id, name, size}) => ({id, name, size, state: 'reading'}))];
const patch = (list, id, change) => list.map(item => item.id === id ? {...item, ...change} : item);
export const markReady = (list, id, extra) => patch(list, id, {...extra, state: 'ready'});
export const markError = (list, id, reason) => patch(list, id, {state: 'error', reason});
export const removeAttachment = (list, id) => list.filter(item => item.id !== id);

const REASONS = {
  unsupported: 'only JPEG, PNG and WebP images are supported.',
  too_large: 'the image is too large even after resizing.',
  too_many: `a message takes at most ${ATTACHMENT_LIMITS.maxImages} images.`,
  unreadable: 'the browser could not read it.',
};
export const attachmentError = (name, reason) =>
  `Couldn’t read ${name}: ${REASONS[reason] ?? REASONS.unreadable}`;
