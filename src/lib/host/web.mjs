import {ATTACHMENT_LIMITS, kindOf, validateAttachments} from '../composer-attachments.mjs';
import {notAvailable} from './contract.mjs';

const SERVICE = '/api/service/';
const FLAGS = new Set(['hostedTasks', 'attachments']);

// Wraps the existing same-origin proxy; Clerk stays server-side behind it, so the UI never holds a token.
export function createWebHost({fetcher = (...args) => globalThis.fetch(...args)} = {}) {
  return {
    auth: {kind: 'web-session', fetchCredentials: 'same-origin'},
    tasks: {
      request: (path, init) => fetcher(SERVICE + path, {cache: 'no-store', credentials: 'same-origin', ...init}),
      url: path => SERVICE + path,
    },
    native: {status: () => notAvailable('Revit tools run in the DATUMM desktop app.')},
    attachments: {limits: ATTACHMENT_LIMITS, kindOf, validate: validateAttachments},
    settings: {status: () => notAvailable('Local settings belong to the desktop app.')},
    window: {status: () => notAvailable('The browser owns the window.')},
    capabilities: {has: flag => FLAGS.has(flag)},
  };
}
