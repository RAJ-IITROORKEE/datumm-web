import type { Run } from './use-workspace-state';

/** Compact read-only brief summary (footprint, entry, counts) for the Properties tab. */
export function BriefChips({ run }: { run: Run | null | undefined }) {
  const brief = run?.data.agent_interpreted_brief, site = run?.data.agent_design?.brief.site;
  const chips: string[] = [];
  if (site) chips.push(`${site.widthMm.toLocaleString()} × ${site.depthMm.toLocaleString()} mm`);
  const value = (key: string) => brief?.values[key]?.value;
  const entry = site?.entry ?? value('entry');
  if (entry) chips.push(`${entry} entry`);
  for (const [key, noun] of [['bedrooms', 'bedroom'], ['guestRooms', 'guest room'], ['bathrooms', 'bathroom']] as const) {
    const count = Number(value(key));
    if (Number.isFinite(count) && count > 0) chips.push(`${count} ${noun}${count === 1 ? '' : 's'}`);
  }
  const rooms = run?.data.agent_design?.brief.requirements.length;
  if (rooms) chips.push(`${rooms} requirements`);
  if (brief?.unresolved.length) chips.push(`${brief.unresolved.length} to confirm`);
  if (!chips.length) return null;
  return (
    <ul className="brief-chips" aria-label="Brief summary">
      {chips.map((chip) => <li key={chip}>{chip}</li>)}
    </ul>
  );
}
