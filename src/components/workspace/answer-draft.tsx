import styles from './answer-draft.module.css';

/**
 * The model's answer while it is written, shown as plain text (never Markdown, links or tools).
 * It is not announced token by token: aria-busy and aria-live="off" hold it back, and the checked
 * answer that replaces it is announced once as ordinary content.
 */
export function DraftAnswer({ text }: { text: string }) {
  return (
    <div className={styles.draft} aria-busy="true" aria-live="off" data-answer-draft="">
      <p className={styles.label} title="Draft, not yet checked">Writing…</p>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
