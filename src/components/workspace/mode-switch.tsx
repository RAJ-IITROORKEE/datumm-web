'use client';
import { Info } from 'lucide-react';
import type { WorkMode } from '@/lib/work-modes.mjs';
import { SegmentedControl } from '../vendor/affectui/segmented-control-clean';
import styles from './mode-switch.module.css';

/** Design | Review plus the Details button, for the work-area header (split layout). */
export function ModeSwitch({mode, onMode, reviewDisabled, detailsOpen, onDetails}: {
  mode: WorkMode; onMode: (mode: WorkMode) => void; reviewDisabled: boolean; detailsOpen: boolean; onDetails: () => void;
}) {
  return <div className={styles.bar} data-mode-switch>
    <SegmentedControl size="lg" variant="tray" aria-label="Work area mode" value={mode} onChange={onMode}
      options={[{value: 'design', label: 'Design'}, {value: 'review', label: 'Review', disabled: reviewDisabled}]} />
    <button type="button" className={styles.details} data-details-button aria-label="Details" title="Details"
      aria-haspopup="dialog" aria-expanded={detailsOpen} onClick={onDetails}><Info size={16} aria-hidden="true" /><span>Details</span></button>
  </div>;
}
