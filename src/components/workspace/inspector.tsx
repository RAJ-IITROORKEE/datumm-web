'use client';

import { useLayoutEffect, useRef } from 'react';
import type { InspectorProps } from '@/lib/work-area-contract';
import { DetailsDrawer } from './details-drawer';
import styles from './work-area.module.css';
export type { InspectorProps } from '@/lib/work-area-contract';

/** Controlled presentation only: the shell retains task, preview and report ownership. */
export function Inspector({scope, section, mode = 'design', preview, propertiesOpen, actions, slots, headerLead, headerAction}: InspectorProps) {
  const page = Boolean(slots.page), showingPreview = !page && preview.kind !== 'drawing';
  const reviewing = mode === 'review' && !page && !showingPreview, designShown = !page && !showingPreview && !reviewing;
  const root = useRef<HTMLElement>(null);
  // Hiding a panel must not leave focus inside it; the mode switch is the stable place to land.
  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && root.current?.contains(focused) && focused.closest('[hidden],[inert]')) root.current.querySelector<HTMLElement>('[data-mode-switch] [aria-checked="true"]')?.focus();
  }, [mode, propertiesOpen, preview.kind, scope.key, scope.epoch]);
  return <section ref={root} className={styles.host} aria-label="Work area" onKeyDown={event => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('select,[role="combobox"]') || Array.from(document.querySelectorAll('[role="dialog"],[role="menu"]')).some(element => element.getClientRects().length > 0)) return;
    if (propertiesOpen) { event.preventDefault(); actions.closeProperties(); }
    else if (showingPreview) { event.preventDefault(); actions.closePreview(); }
  }}>
    {(headerLead || headerAction) && <div className={styles.header}><div className={styles.lead}>{headerLead}</div>{headerAction}</div>}
    <div className={styles.design} hidden={!designShown} inert={!designShown}>
      <div className={styles.preview}>{slots.design}</div>
      <aside className={styles.properties} aria-label="Drawing properties" hidden={!propertiesOpen} inert={!propertiesOpen}>
        <header><h2>Properties</h2><button type="button" onClick={() => actions.closeProperties()}>Close properties</button></header>
        <div>{slots.properties}</div>
      </aside>
    </div>
    {page && <div className={styles.scroll}>{slots.page}</div>}
    <div className={styles.scroll} hidden={!reviewing} inert={!reviewing}>{reviewing && slots.review}</div>
    <div className={styles.assetPreview} hidden={!showingPreview} inert={!showingPreview}>
      <button type="button" className={styles.back} onClick={() => actions.closePreview()}>Back to drawing</button>
      {slots.assetPreview}
    </div>
    <DetailsDrawer section={section} page={page} slots={slots} onSection={value => actions.selectSection(value)} />
  </section>;
}
