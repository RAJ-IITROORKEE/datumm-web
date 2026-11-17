// The host adapter contract: the only seam through which shared UI reaches its host (web or desktop).
// The UI holds no approval authority: there is deliberately no approve method on `native`.
export const HOST_SURFACES = ['auth', 'tasks', 'native', 'attachments', 'settings', 'window', 'capabilities'];
export const HOST_CAPABILITY_FLAGS = ['hostedTasks', 'attachments', 'nativeBridge', 'localSettings', 'windowControls'];

export const notAvailable = reason => Object.freeze({available: false, reason});

const MEMBERS = {
  auth: ['kind', 'fetchCredentials'],
  tasks: ['request', 'url'],
  native: ['status'],
  attachments: ['limits', 'kindOf', 'validate'],
  settings: ['status'],
  window: ['status'],
  capabilities: ['has'],
};

// Returns the missing "surface.member" names, so an adapter can fail its own test with a clear list.
export function missingHostMembers(host) {
  const missing = [];
  for (const surface of HOST_SURFACES) {
    for (const name of MEMBERS[surface]) if (host?.[surface]?.[name] === undefined) missing.push(`${surface}.${name}`);
  }
  return missing;
}
