'use client';

import {useEffect, useRef, useState} from 'react';
import {FileImage, ImageIcon, X} from 'lucide-react';
import {
  ATTACHMENT_LIMITS, addAttachments, attachmentError, markError, markReady, removeAttachment,
  validateAttachments, type Attachment,
} from '@/lib/composer-attachments.mjs';
import styles from './attachment-chips.module.css';

const sizeLabel = (bytes: number) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

/** Presentation only, so the fixture can show every state without a browser file. */
export function AttachmentChipList({items, onRemove}: {
  items: Attachment[]; onRemove(id: string): void;
}) {
  if (!items.length) return null;
  return (
    <ul className={styles.list} aria-label="Attachments">
      {items.map(item => (
        <li key={item.id} className={styles.chip} data-state={item.state}
          aria-busy={item.state === 'reading' || undefined}>
          <span className={styles.thumb} aria-hidden="true">
            {item.url ? <img src={item.url} alt="" /> :
              item.state === 'error' ? <FileImage size={16} /> : <ImageIcon size={16} />}
          </span>
          <span className={styles.text}>
            <span className={styles.name} title={item.name}>{item.name}</span>
            <span className={styles.meta} role={item.state === 'error' ? 'alert' : undefined}>
              {item.state === 'reading' ? 'Reading…' :
                item.state === 'error' ? attachmentError(item.name, item.reason ?? '') :
                  sizeLabel(item.size)}
            </span>
          </span>
          <button type="button" className={styles.remove} onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Resizes to the long-edge limit as JPEG; the result is what a backend would receive. */
async function readImage(file: File): Promise<{url: string; size: number}> {
  if (file.size > ATTACHMENT_LIMITS.maxInputBytes) throw new Error('too_large');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, ATTACHMENT_LIMITS.maxEdgePx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/jpeg', 0.85));
  if (!blob) throw new Error('unreadable');
  if (blob.size > ATTACHMENT_LIMITS.maxRawBytes) throw new Error('too_large');
  return {url: URL.createObjectURL(blob), size: blob.size};
}

function Chips() {
  const root = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Attachment[]>([]);
  const [notice, setNotice] = useState('');
  const [dropping, setDropping] = useState(false);
  const live = useRef(items);
  live.current = items;
  const mounted = useRef(true);

  const add = (files: File[]) => {
    if (!files.length) return;
    const {accepted, errors} = validateAttachments(live.current, files);
    setNotice(errors.map(row => attachmentError(row.name, row.reason)).join(' '));
    const rows = accepted.map(
      file => ({id: crypto.randomUUID(), name: file.name, size: file.size}));
    live.current = addAttachments(live.current, rows);
    setItems(live.current);
    accepted.forEach((file, index) => {
      const {id} = rows[index];
      readImage(file).then(
        done => {
          // Removed or unmounted while reading: nothing will ever show or release this URL.
          if (!mounted.current || !live.current.some(item => item.id === id)) {
            URL.revokeObjectURL(done.url);
            return;
          }
          setItems(list => markReady(list, id, done));
        },
        failure => setItems(list => markError(list, id, (failure as Error).message)),
      );
    });
  };
  const addRef = useRef(add);
  addRef.current = add;

  useEffect(() => {
    const form = root.current?.closest('form');
    const paste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      addRef.current(files);
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      setDropping(true);
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      setDropping(false);
      addRef.current([...(event.dataTransfer?.files ?? [])]);
    };
    const leave = () => setDropping(false);
    document.addEventListener('paste', paste);
    form?.addEventListener('dragover', over);
    form?.addEventListener('dragleave', leave);
    form?.addEventListener('drop', drop);
    return () => {
      document.removeEventListener('paste', paste);
      form?.removeEventListener('dragover', over);
      form?.removeEventListener('dragleave', leave);
      form?.removeEventListener('drop', drop);
    };
  }, []);
  // Blob URLs are released only when the whole row goes away.
  useEffect(() => () => {
    mounted.current = false;
    live.current.forEach(item => item.url && URL.revokeObjectURL(item.url));
  }, []);

  return (
    <div ref={root} className={dropping ? `${styles.root} ${styles.dropping}` : styles.root}>
      <AttachmentChipList items={items} onRemove={id => {
        const gone = live.current.find(item => item.id === id);
        if (gone?.url) URL.revokeObjectURL(gone.url);
        live.current = removeAttachment(live.current, id);
        setItems(live.current);
      }} />
      {notice && <p className={styles.notice} role="alert">{notice}</p>}
    </div>
  );
}

/**
 * Mounted only when the backend reports `attachments` and a send path carries them; otherwise
 * nothing runs at all, so a user is never shown files that would silently not be sent.
 */
export function AttachmentChips({enabled, canSend}: {enabled: boolean; canSend: boolean}) {
  return enabled && canSend ? <Chips /> : null;
}
