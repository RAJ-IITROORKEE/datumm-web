'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { sectionForDrawerTab, workStateFromSection, type DrawerTab } from '@/lib/work-modes.mjs';
import type { InspectorProps, WorkAreaSection } from '@/lib/work-area-contract';
import type { Run } from './use-workspace-state';
import { SegmentedControl } from '../vendor/affectui/segmented-control-clean';
import styles from './details-drawer.module.css';

type Tab = DrawerTab | 'revit';
const tabs: {value: Tab; label: string}[] = [
  {value: 'activity', label: 'Activity'}, {value: 'files', label: 'Files'},
  {value: 'exports', label: 'Exports'}, {value: 'revit', label: 'Revit'},
  {value: 'technical', label: 'Technical'},
];

/**
 * Right sheet for Activity, Files, Exports and Technical. Open state is derived from the stored
 * section, so every action that used to select one of those tabs opens it here instead.
 */
export function DetailsDrawer({section, page, slots, onSection}: {
  section: WorkAreaSection; page: boolean; slots: InspectorProps['slots']; onSection: (section: WorkAreaSection) => void;
}) {
  // Technical and Revit have no stored section, so the drawer keeps them locally.
  const [local, setLocal] = useState<'technical' | 'revit' | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const {drawer} = workStateFromSection(section);
  const open = drawer !== null && !page;
  // The sheet has no Radix trigger, so remember what had focus before Radix moves it inside.
  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (open) opener.current = focused instanceof HTMLElement && focused !== document.body ? focused : null;
  }, [open]);
  const hasRevit = Boolean(slots.revit);
  const tab: Tab = local === 'revit' && !hasRevit ? 'activity' : local ?? drawer ?? 'activity';
  const content: Record<Tab, ReactNode> = {activity: slots.activity, files: slots.assets, exports: slots.exports, revit: slots.revit, technical: slots.technical};
  const close = () => { setLocal(null); onSection('design'); };
  return <Sheet open={open} onOpenChange={next => { if (!next) close(); }}>
    <SheetContent className={styles.drawer} onCloseAutoFocus={event => {
      // Always handled here: Radix's own fallback focuses a trigger that does not exist, leaving BODY.
      event.preventDefault();
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-details-button]'));
      const target = opener.current?.isConnected ? opener.current : buttons.find(item => item.getClientRects().length > 0);
      target?.focus();
    }}>
      <div className={styles.head}>
        <SheetTitle>Details</SheetTitle>
        <SheetClose className={styles.close} aria-label="Close details"><X size={16} aria-hidden="true" /></SheetClose>
      </div>
      <SheetDescription className="sr-only">Activity, files, exports and technical details for this chat.</SheetDescription>
      <div className={styles.tabs}>
        <SegmentedControl size="lg" variant="underline" kind="tabs" aria-label="Details sections" value={tab}
          options={tabs.filter(item => item.value !== 'revit' || hasRevit).map(item => ({...item, controls: `details-panel-${item.value}`}))}
          onChange={next => {
            setLocal(next === 'technical' || next === 'revit' ? next : null);
            const target = sectionForDrawerTab(next);
            if (target) onSection(target);
          }} />
      </div>
      <div className={styles.body} role="tabpanel" id={`details-panel-${tab}`}>{content[tab]}</div>
    </SheetContent>
  </Sheet>;
}

/** Ids, versions, fingerprints, revisions and models moved out of the main view, as a plain list. */
export function TechnicalDetails({run}: {run: Run | null}) {
  if (!run) return <p className={styles.note}>Open a chat to see its technical details.</p>;
  const plan = run.currentPlanRef, proposal = run.data.proposal;
  const rows: [string, ReactNode][] = [
    ['Task', <code key="t">{run.id}</code>], ['Task version', run.taskVersion ?? 'Not supplied'],
    ['Status', run.status], ['Mode', run.mode], ['Model', run.model],
    ...(plan ? [['Plan', <code key="p">{plan.planId}</code>], ['Plan version', plan.version], ['Fingerprint', <code key="f">{plan.fingerprint}</code>]] as [string, ReactNode][] : []),
    ...(run.data.agent_design?.briefId ? [['Brief', <code key="b">{run.data.agent_design.briefId}</code>]] as [string, ReactNode][] : []),
    ...(run.data.concept?.model ? [['Concept image model', <code key="cm">{run.data.concept.model}</code>]] as [string, ReactNode][] : []),
    ...(run.data.build_type_review ? [['Size review revision', run.data.build_type_review.revision]] as [string, ReactNode][] : []),
    ...(run.data.agent_inspection ? [['Model analysis revision', run.data.agent_inspection.revision]] as [string, ReactNode][] : []),
    ...(run.data.agent_postbuild_inventory ? [['Model revision after build', run.data.agent_postbuild_inventory.revision]] as [string, ReactNode][] : []),
    ...(proposal ? [['Document', <code key="d">{proposal.documentId}</code>], ['Model revision', proposal.revision], ['Proposal', <code key="pr">{proposal.proposalId}</code>], ['Approval hash', <code key="h">{proposal.approvalHash}</code>]] as [string, ReactNode][] : []),
  ];
  return <dl className={styles.facts}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
