import { formatChange, type ConfigChange } from '@/lib/admin-history.mjs';
import styles from './history-section.module.css';

/** Changed settings as "path: before → after", or "changed" where the value is hidden. */
export function ChangeList({ changes, truncated = false, empty }: {
  changes: ConfigChange[]; truncated?: boolean; empty: string;
}) {
  if (changes.length === 0) return <p className={styles.note}>{empty}</p>;
  return <>
    <ul className={styles.changes}>
      {changes.map((change, index) => (
        <li key={`${change.path}:${index}`}>
          <code>{change.path}</code> <span>{formatChange(change)}</span>
        </li>
      ))}
    </ul>
    {truncated && <p className={styles.note}>and more changes</p>}
  </>;
}
