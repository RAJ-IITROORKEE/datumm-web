// Pure admin gate: primary email must be in the ADMIN_EMAILS comma list (default: the owner).
export const DEFAULT_ADMIN_EMAILS = 'rajrabidas001@gmail.com';
export function adminEmails(raw) {
  const list = String(raw ?? '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  return list.length ? list : [DEFAULT_ADMIN_EMAILS];
}
export function isAdminEmail(email, raw) {
  return typeof email === 'string' && adminEmails(raw).includes(email.trim().toLowerCase());
}
