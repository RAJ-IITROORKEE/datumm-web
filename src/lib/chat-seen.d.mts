export function advanceSeen(seen: Record<string, number>, runs: { id: string; taskVersion?: number }[], openId: string): Record<string, number>;
export function isUnread(run: { id: string; status: string; taskVersion?: number }, seen: Record<string, number>, openId: string): boolean;
