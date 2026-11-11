export const DEFAULT_ADMIN_EMAILS: string;
export function adminEmails(raw?: string | null): string[];
export function isAdminEmail(email: string | null | undefined, raw?: string | null): boolean;
