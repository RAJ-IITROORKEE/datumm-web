import { formatCount, type SkillUse } from '@/lib/admin-traces.mjs';
import styles from './skills-section.module.css';

/** Runs per skill across the scanned runs; hidden when the backend sent no usage. */
export function SkillUseTable({ rows }: { rows: SkillUse[] }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ padding: '0 20px 18px' }}>
      <table className={styles.useTable}>
        <caption style={{ textAlign: 'left', fontSize: 13, fontWeight: 500, paddingBottom: 6 }}>
          Skill use
        </caption>
        <thead><tr><th scope="col">Skill</th><th scope="col">Runs</th></tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{row.name} <code>{row.id}</code></td><td>{formatCount(row.runs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
