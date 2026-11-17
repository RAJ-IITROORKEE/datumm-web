export type AttachmentReason = 'unsupported' | 'too_large' | 'too_many' | 'unreadable';
export type Attachment = {
  id: string; name: string; size: number; state: 'reading' | 'ready' | 'error';
  url?: string; reason?: AttachmentReason | string;
};
type FileLike = {name: string; type: string; size: number};
export const ATTACHMENT_LIMITS: Readonly<{
  maxImages: 4; maxRawBytes: 1500000; maxEdgePx: 1568; maxInputBytes: 20000000;
}>;
export function kindOf(file: {type?: string} | null | undefined): 'image' | 'unsupported';
export function validateAttachments<T extends FileLike>(
  existing: Pick<Attachment, 'state'>[], incoming: T[],
): {accepted: T[]; errors: {name: string; reason: 'unsupported' | 'too_many'}[]};
export function addAttachments(
  list: Attachment[], rows: {id: string; name: string; size: number}[],
): Attachment[];
export function markReady(
  list: Attachment[], id: string, extra?: Partial<Attachment>,
): Attachment[];
export function markError(list: Attachment[], id: string, reason: string): Attachment[];
export function removeAttachment(list: Attachment[], id: string): Attachment[];
export function attachmentError(name: string, reason: string): string;
