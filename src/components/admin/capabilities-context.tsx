'use client';
import { createContext, useContext } from 'react';
import { parseCapabilities, type Capabilities } from '@/lib/capabilities.mjs';

// The shell already reads the backend capabilities; pages read them from here instead of
// fetching again. `null` means "not loaded yet", so a page can wait rather than guess.
const CapabilitiesContext = createContext<Capabilities | null>(parseCapabilities(undefined));
export const CapabilitiesProvider = CapabilitiesContext.Provider;
export const useCapabilities = () => useContext(CapabilitiesContext);
