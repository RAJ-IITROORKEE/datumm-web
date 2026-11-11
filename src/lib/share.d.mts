export function shareUrl(origin: string, token: string): string;
export function validToken(token: unknown): boolean;
export function shareToken(body: unknown): string | null;
export function svgDataUri(svg: string): string;
export type SharedView = { title: string; createdAt: string; messages: { role: 'user' | 'assistant'; text: string; at: string }[]; steps: { title: string; status: string }[]; sources: { title: string; url: string }[]; svg: string | null };
export function sharedView(body: unknown): SharedView | null;
