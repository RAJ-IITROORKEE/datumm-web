import styles from './data-settings.module.css';

// Read-only. Every figure here is verified in the backend: retention.py (180 days), share_api.py (30 days).
const GROUPS = [
  { title: 'What we keep', items: [
    'Your chats and the runs behind them: messages, steps, sources and generated plans.',
    'Plan versions and briefs, saved per project. They are never changed after they are saved.',
    'The service keeps daily encrypted backups. To restore something, ask support.',
  ] },
  { title: 'How long', items: [
    'Finished chats and their runs are kept for 180 days after they were created, then a daily job removes them.',
    'Chats that are still running, waiting for your answer, or holding a Revit change are never removed by that job.',
  ] },
  { title: 'Share links', items: [
    'A share link expires 30 days after you create it.',
    'You can revoke a link at any time. Open the chat’s menu, choose Share, then Stop sharing.',
  ] },
  { title: 'Deleting or exporting a chat', items: [
    'To delete a chat, open its menu in the sidebar and choose Delete chat. It is hidden from your history.',
    'To export drawings, files or tables, open Details (the “i” button in the work area) and choose Exports.',
  ] },
  { title: 'Revit', items: [
    'DATUMM never changes your Revit model without your exact approval.',
  ] },
];

export function DataSettings() {
  return (
    <div className={styles.panel}>
      {GROUPS.map(group => (
        <section key={group.title} aria-labelledby={`data-${group.title.replace(/\W+/g, '-').toLowerCase()}`}>
          <h2 id={`data-${group.title.replace(/\W+/g, '-').toLowerCase()}`}>{group.title}</h2>
          <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
