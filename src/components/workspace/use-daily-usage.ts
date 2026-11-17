'use client';
import { useEffect, useState } from 'react';
import { parseDailyUsage, type DailyUsage } from '@/lib/daily-usage.mjs';
import { api } from './use-workspace-state';

/** Today's usage for the composer status line; null while off, loading, failed or malformed. Refetches when `refreshKey` changes. */
export function useDailyUsage(enabled: boolean, refreshKey: string) {
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  useEffect(() => {
    if (!enabled) { setUsage(null); return; }
    let live = true;
    api<unknown>('me/usage/today')
      .then(body => { if (live) setUsage(parseDailyUsage(body)); })
      .catch(() => { if (live) setUsage(null); });
    return () => { live = false; };
  }, [enabled, refreshKey]);
  return usage;
}
