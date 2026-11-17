'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { ArrowLeft, Box, CircleUserRound, Palette, SlidersHorizontal, Sparkles, Blocks, BarChart3, CreditCard, ShieldCheck, Search, X, ChevronDown, type LucideIcon } from 'lucide-react';
import { AccountProfileEditor } from './onboarding/account-onboarding';
import { PricingPlans } from './billing/pricing-plans';
import { ThemeSettings } from './theme-settings';
import { PermissionsSettings } from './permissions-settings';
import { Button } from './ui/button';
import { filterSettingsSections, modelIdentity, settingsSections } from './settings-navigation.mjs';
import styles from './desktop-settings.module.css';

const sectionIcons: Record<string, LucideIcon> = { account: CircleUserRound, general: SlidersHorizontal, appearance: Palette, permissions: ShieldCheck, models: Sparkles, revit: Box, usage: BarChart3, billing: CreditCard, capabilities: Blocks };

export function DesktopSettings({ open, onOpenChange, generalContent, revitContent, models = [], authConfigured = false, usageContent, taskTitle, sectionRequest, approvalModes = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; generalContent?: ReactNode; revitContent?: ReactNode; models?: string[]; authConfigured?: boolean; usageContent?: ReactNode; taskTitle?: string; sectionRequest?:{id:string;revision:number}; approvalModes?: boolean;
}) {
  const [section, setSection] = useState('general');
  const [accountVisited, setAccountVisited] = useState(false);
  const [query, setQuery] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigationId = useId();
  const handledRequest = useRef<number | null>(null);
  const currentSection = settingsSections.find(item => item.id === section)!;
  // Permissions needs the backend `approvalModes` capability; unknown means hidden.
  const matches = filterSettingsSections(query).filter(item => approvalModes || item.id !== 'permissions');

  useLayoutEffect(() => {
    if (!open || !sectionRequest || handledRequest.current === sectionRequest.revision) return;
    if (!settingsSections.some(item => item.id === sectionRequest.id)) return;
    handledRequest.current = sectionRequest.revision;
    setQuery('');
    selectSection(sectionRequest.id);
  }, [open, sectionRequest]);

  function focusSection() {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (open) focusSection();
  }, [open, section]);

  function selectSection(id: string) {
    setNavigationOpen(false);
    if (id === 'account') setAccountVisited(true);
    if (section === id) focusSection();
    else setSection(id);
  }

  function clearSearch() {
    setQuery('');
    searchRef.current?.focus();
  }

  return (
    <section className={styles.embedded + ' studio-settings-embedded'} aria-label="Settings" hidden={!open} inert={!open} style={!open ? {display:'none'} : undefined}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarActions}>
            <Button variant="ghost" className={styles.backButton} onClick={() => onOpenChange(false)}><ArrowLeft size={15} aria-hidden />Back to workspace</Button>
            <Button variant="ghost" className={styles.browseButton} aria-expanded={navigationOpen} aria-controls={navigationId} onClick={() => setNavigationOpen(value => !value)}>
              Browse sections<ChevronDown size={14} aria-hidden />
            </Button>
          </div>
          <div id={navigationId} className={styles.navPanel} data-expanded={navigationOpen}>
            <div className={'settings-search ' + styles.sectionSearch}>
              <Search size={14} aria-hidden />
              <input ref={searchRef} type="search" aria-label="Find a settings section" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
                if (event.key === 'Escape' && query) { event.preventDefault(); event.stopPropagation(); clearSearch(); }
              }} />
              {query && <Button variant="ghost" className={styles.clearSearch} aria-label="Clear section search" onClick={clearSearch}><X size={14} aria-hidden /></Button>}
            </div>
            <nav className={'settings-navigation ' + styles.navigation} aria-label="Settings sections">
              {['Personal', 'Workspace'].map(group => {
                const items = matches.filter(item => item.group === group);
                return items.length > 0 && <div className={styles.navGroup} key={group} role="group" aria-label={group}>
                  <h2 className={styles.groupTitle}>{group}</h2>
                  {items.map(({ id, title }) => {
                    const Icon = sectionIcons[id];
                    return <Button variant="ghost" key={id} className={'settings-nav-item ' + styles.navItem} aria-pressed={section === id} onClick={() => selectSection(id)}><Icon size={15} aria-hidden /><span className={styles.navTitle}>{title}</span></Button>;
                  })}
                </div>;
              })}
              {matches.length === 0 && <p className={styles.searchEmpty} role="status">No matching sections. Try “profile”, “models” or “usage”.</p>}
            </nav>
          </div>
        </aside>
        <main ref={contentRef} className={'settings-content ' + styles.content}>
          <header className={styles.sectionHeading}><h1 ref={headingRef} tabIndex={-1} className={styles.pageTitle}>{currentSection.title}</h1><p>{currentSection.description}</p></header>
          {section === 'general' && <div className={styles.generalContent}>{generalContent}</div>}
          {section === 'appearance' && <ThemeSettings motionRow={null} advancedControl={null} />}
          {accountVisited && <section className="provider-section" hidden={section !== 'account'} inert={section !== 'account'} style={section !== 'account' ? {display:'none'} : undefined}>{authConfigured ? <><Show when="signed-in"><div className={styles.identityRow}><UserButton showName /><span>Manage your sign-in and account security</span></div><AccountProfileEditor /></Show><Show when="signed-out"><SignInButton mode="modal"><Button>Sign in to DATUMM</Button></SignInButton></Show></> : <div className={styles.unavailableState} role="status"><h2>Sign-in unavailable</h2><p>Sign-in is not configured in this workspace.</p></div>}</section>}
          {section === 'permissions' && <PermissionsSettings />}
          {section === 'models' && <section className="provider-section">
            <p>Choose a model and reasoning effort in the conversation toolbar. Model access is managed by the hosted workspace.</p>
            {models.length ? <ul className={styles.modelCatalog} aria-label="Reported models">{models.map((model, index) => {
              const identity = modelIdentity(model);
              return <li className={styles.catalogRow} key={`${model}-${index}`}><Sparkles size={16} aria-hidden /><div><strong>{identity.name}</strong><span>{identity.provider ? `Provider · ${identity.provider}` : 'Provider not reported'}</span><code>{model}</code></div></li>;
            })}</ul> : <div className={styles.unavailableState} role="status"><h2>No model catalog available</h2><p>This workspace has not reported any available models. Check your workspace connection to load the catalog.</p></div>}
          </section>}
          {section === 'revit' && revitContent}
          {section === 'usage' && <section className="provider-section"><h2>Current task</h2>{taskTitle && <p className={styles.taskTitle}>{taskTitle}</p>}{usageContent ?? <div className={styles.emptyState}><BarChart3 size={24} aria-hidden /><h3>No usage data yet</h3><p>Open a task with reported usage to see its context, tokens and provider cost.</p></div>}<p className={styles.footnote}>Task usage is separate from billing. Account-wide totals and billing quotas are not available yet.</p></section>}
          {section === 'billing' && <PricingPlans embedded />}
          {section === 'capabilities' && <section className="provider-section">
            <dl className={styles.capabilityList}>
              <div><dt>Web workspace</dt><dd>Saved conversations, planning, drawing review and exports.</dd></div>
              <div><dt>Revit connector</dt><dd>Requires the separately installed connector and a connected model. Review each exact proposal before approving changes.</dd></div>
              <div><dt>DATUMM Desktop</dt><dd>Required for local project folders, file attachments, dictation, custom provider credentials, desktop MCP packs and queued background prompts.</dd></div>
              <div><dt>Calendar scheduling</dt><dd>Unavailable.</dd></div>
            </dl>
          </section>}
        </main>
      </div>
    </section>
  );
}
