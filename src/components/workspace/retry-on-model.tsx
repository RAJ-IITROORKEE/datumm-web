'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {modelName} from '@/lib/model-display.mjs';

/** One button on a provider-failure card; absent when there is no other served model. */
export function RetryOnModel({model, busy, onRetry}: {
  model: string | null | undefined; busy: boolean; onRetry(): Promise<void> | void;
}) {
  const [retrying, setRetrying] = useState(false);
  if (!model) return null;
  return (
    <Button type="button" variant="secondary" size="sm" disabled={busy || retrying}
      onClick={async () => {
        setRetrying(true);
        try { await onRetry(); } finally { setRetrying(false); }
      }}>
      {retrying ? 'Retrying…' : `Retry with ${modelName(model)}`}
    </Button>
  );
}
