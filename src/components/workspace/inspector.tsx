'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import type { InspectorProps, WorkAreaSection } from '@/lib/work-area-contract';
import styles from './work-area.module.css';
export type { InspectorProps } from '@/lib/work-area-contract';

const sections: {id: WorkAreaSection; label: string}[] = [
  {id: 'design', label: 'Design'}, {id: 'activity', label: 'Activity'},
  {id: 'assets', label: 'Assets'}, {id: 'exports', label: 'Exports'},
];

/** Controlled presentation only: the shell retains task, preview and report ownership. */
export function Inspector({scope, section, preview, propertiesOpen, actions, slots, headerAction}: InspectorProps) {
  const showingPreview = preview.kind !== 'drawing' && (section === 'assets' || section === 'exports');
  const id = useId(), root = useRef<HTMLElement>(null);
  const focusTab = (value: WorkAreaSection) => root.current?.querySelector<HTMLButtonElement>(`[data-section="${value}"]`)?.focus();
  const select = (value: WorkAreaSection) => { focusTab(value); actions.selectSection(value); };
  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && root.current?.contains(focused) && focused.closest('[hidden],[inert]')) focusTab(section);
  }, [section, propertiesOpen, preview.kind, scope.key, scope.epoch]);
  return <section ref={root} className={styles.host} aria-label="Work area" onKeyDown={event => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('select,[role="combobox"]') || Array.from(document.querySelectorAll('[role="dialog"],[role="menu"]')).some(element => element.getClientRects().length > 0)) return;
    if (propertiesOpen) { event.preventDefault(); actions.closeProperties(); }
    else if (showingPreview) { event.preventDefault(); actions.closePreview(); }
  }}>
    <div className={styles.header}>
    <div className={styles.tabs} role="tablist" aria-label="Work area sections">
      {sections.map((item, index) => <button key={item.id} type="button" role="tab" id={`${id}-${item.id}-tab`} data-section={item.id}
        aria-selected={section === item.id} aria-controls={showingPreview && section === item.id ? `${id}-asset-preview` : `${id}-${item.id}-panel`} tabIndex={section === item.id ? 0 : -1}
        onClick={() => select(item.id)} onKeyDown={event => {
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : event.key === 'ArrowRight' ? (index + 1) % sections.length : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length : -1;
          if (next >= 0) { event.preventDefault(); select(sections[next].id); }
        }}>{item.label}</button>)}
    </div>
    {headerAction}
    </div>
    <div className={styles.design} role="tabpanel" id={`${id}-design-panel`} aria-labelledby={`${id}-design-tab`} hidden={section !== 'design'} inert={section !== 'design'}>
      <div className={styles.preview}>{slots.design}</div>
      <aside className={styles.properties} aria-label="Drawing properties" hidden={!propertiesOpen} inert={!propertiesOpen}>
        <header><h2>Properties</h2><button type="button" onClick={() => { focusTab('design'); actions.closeProperties(); }}>Close properties</button></header>
        <div>{slots.properties}</div>
      </aside>
    </div>
    <div className={styles.scroll} role="tabpanel" id={`${id}-activity-panel`} aria-labelledby={`${id}-activity-tab`} hidden={section !== 'activity'} inert={section !== 'activity'}>{slots.activity}</div>
    <div className={styles.scroll} role="tabpanel" id={`${id}-assets-panel`} aria-labelledby={`${id}-assets-tab`} hidden={section !== 'assets' || showingPreview} inert={section !== 'assets' || showingPreview}>{slots.assets}</div>
    <div className={styles.scroll} role="tabpanel" id={`${id}-exports-panel`} aria-labelledby={`${id}-exports-tab`} hidden={section !== 'exports' || showingPreview} inert={section !== 'exports' || showingPreview}>{slots.exports}</div>
    <div id={`${id}-asset-preview`} className={styles.assetPreview} role="tabpanel" aria-labelledby={`${id}-${section}-tab`} hidden={!showingPreview} inert={!showingPreview}>
      <button type="button" className={styles.back} onClick={() => actions.closePreview()}>Back to {section === 'exports' ? 'exports' : 'assets'}</button>
      {slots.assetPreview}
    </div>
  </section>;
}
