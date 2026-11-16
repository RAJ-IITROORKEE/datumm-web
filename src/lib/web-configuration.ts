import 'server-only';

/** Safe presence checks only: configured credentials and origins may still be unavailable. */
export function getWebConfiguration(env: Record<string, string | undefined> = process.env) {
  const publicKey = Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
  const secretKey = Boolean(env.CLERK_SECRET_KEY?.trim());
  const accountReason: 'configured' | 'missing' | 'partial' = publicKey && secretKey ? 'configured' : publicKey || secretKey ? 'partial' : 'missing';
  const origin = env.ORCHESTRATOR_URL?.trim();
  let serviceReason: 'configured' | 'missing' | 'invalid' = origin ? 'invalid' : 'missing';
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) serviceReason = 'configured';
    } catch { /* Invalid origins remain unavailable; no environment value is returned. */ }
  }
  return {
    account: { configured: accountReason === 'configured', reason: accountReason },
    service: { configured: serviceReason === 'configured', reason: serviceReason },
  };
}
