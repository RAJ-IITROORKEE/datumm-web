'use client';

import { useState, type ReactNode } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { ArrowLeft, Box, CircleUserRound, Palette, SlidersHorizontal, Sparkles, Blocks, BarChart3, CreditCard } from 'lucide-react';
import { AccountProfileEditor } from './onboarding/account-onboarding';
import { PricingPlans } from './billing/pricing-plans';
import { ThemeSettings } from './theme-settings';
import { Button } from './ui/button';
import styles from './desktop-settings.module.css';

const sections=[['account','Profile & account',CircleUserRound],['general','Preferences',SlidersHorizontal],['appearance','Appearance',Palette],['models','Models',Sparkles],['revit','Revit connection',Box],['usage','Usage',BarChart3],['billing','Billing',CreditCard],['capabilities','Capabilities',Blocks]] as const;
const descriptions:Record<string,string>={account:'Your profile, work and sign-in details.',general:'Make the workspace fit the way you work.',appearance:'Choose your theme, density and reading size.',models:'Models available to your connected workspace.',revit:'Bring model context into the conversation.',usage:'Understand the resources used by the current task.',billing:'Subscription and payment availability.',capabilities:'What you can do on the web and in Revit.'};
export function DesktopSettings({open,onOpenChange,generalContent,revitContent,models=[],authConfigured=false,usageContent,taskTitle}: {
  open:boolean;onOpenChange:(open:boolean)=>void;generalContent?:ReactNode;revitContent?:ReactNode;models?:string[];authConfigured?:boolean;usageContent?:ReactNode;taskTitle?:string;
}) {
  const [section,setSection]=useState<string>('general');
  if(!open)return null;
  return <section className={styles.embedded+' studio-settings-embedded'} aria-label="Settings"><div className={styles.layout}>
    <aside className={styles.sidebar}><Button variant="ghost" className={styles.backButton} onClick={()=>onOpenChange(false)}><ArrowLeft size={15}/>Back to workspace</Button><nav className={'settings-navigation '+styles.navigation} aria-label="Settings sections">{sections.map(([id,title,Icon])=><Button variant="ghost" key={id} className={'settings-nav-item '+styles.navItem} aria-pressed={section===id} onClick={()=>setSection(id)}><Icon size={15}/><span className={styles.navTitle}>{title}</span></Button>)}</nav></aside>
    <main className={'settings-content '+styles.content}><header className={styles.sectionHeading}><h1 className={styles.pageTitle}>{sections.find(([id])=>id===section)?.[1]}</h1><p>{descriptions[section]}</p></header>
      {section==='general'&&generalContent}
      {section==='appearance'&&<ThemeSettings motionRow={null} advancedControl={null}/>}
      {section==='account'&&<section className="provider-section">{authConfigured?<><Show when="signed-in"><div className={styles.identityRow}><UserButton showName/><span>Manage your sign-in and account security</span></div><AccountProfileEditor/></Show><Show when="signed-out"><SignInButton mode="modal"><Button>Sign in to DATUMM</Button></SignInButton></Show></>:<p role="status">Sign-in is not configured in this workspace.</p>}</section>}
      {section==='models'&&<section className="provider-section"><p>Choose a model and reasoning effort in the conversation toolbar. Model access is managed by the hosted workspace.</p>{models.length?<ul>{models.map(model=><li key={model}>{model}</li>)}</ul>:<p>Sign in and connect to load available models.</p>}</section>}
      {section==='revit'&&revitContent}
      {section==='usage'&&<section className="provider-section"><h2>Current task</h2>{taskTitle&&<p className={styles.taskTitle}>{taskTitle}</p>}{usageContent??<div className={styles.emptyState}><BarChart3 size={24} aria-hidden/><h3>No usage data yet</h3><p>Open a task with reported usage to see its context, tokens and provider cost.</p></div>}<p className={styles.footnote}>Task usage is separate from billing. Account-wide totals and billing quotas are not available yet.</p></section>}
      {section==='billing'&&<PricingPlans embedded/>}
      {section==='capabilities'&&<section className="provider-section"><p>This web workspace supports saved conversations, planning, drawing review, exports and an independently installed Revit connector. Review each exact proposal before approving changes.</p><p>Local project folders, file attachments, dictation, custom provider credentials, desktop MCP packs and queued background prompts require DATUMM Desktop. Calendar scheduling is unavailable.</p></section>}
    </main>
  </div></section>;
}
