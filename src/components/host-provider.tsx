'use client';
import {createContext, useContext, type ReactNode} from 'react';
import type {Host} from '@/lib/host/contract.mjs';
import {createWebHost} from '@/lib/host/web.mjs';

const webHost = createWebHost();
const HostContext = createContext<Host>(webHost);

/** Mounted once at the app root. The desktop app supplies its own `host`. */
export function HostProvider({host = webHost, children}: {host?: Host; children: ReactNode}) {
  return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
}

export const useHost = () => useContext(HostContext);
