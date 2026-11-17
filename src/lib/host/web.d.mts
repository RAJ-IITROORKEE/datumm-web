import type {Host} from './contract.mjs';
export function createWebHost(options?: {fetcher?: typeof fetch}): Host;
