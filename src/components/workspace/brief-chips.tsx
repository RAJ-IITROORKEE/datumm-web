import { briefChips } from '@/lib/project-brief.mjs';
import type { Run } from './use-workspace-state';

/** Compact read-only brief summary (footprint, entry, counts) for the Properties tab. */
export function BriefChips({ run }: { run: Run | null | undefined }) {
  const chips = briefChips(run);
  if (!chips.length) return null;
  return (
    <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Brief summary">
      {chips.map((chip) => <li className="max-w-full break-words rounded-md bg-[var(--chip)] px-2 py-1 text-xs leading-4 text-[var(--text)]" key={chip}>{chip}</li>)}
    </ul>
  );
}
