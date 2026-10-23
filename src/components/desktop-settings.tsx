'use client';

import { useState, type ReactNode } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { ArrowLeft, Box, CircleUserRound, Palette, SlidersHorizontal, Sparkles, Blocks } from 'lucide-react';
import { ThemeSettings } from './theme-settings';
import { Button } from './ui/button';
import styles from './desktop-settings.module.css';

const sections=[['general','General',SlidersHorizontal],['account','Account & connections',CircleUserRound],['models','Models',Sparkles],['appearance','Appearance',Palette],['revit','Revit',Box],['capabilities','Workspace capabilities',Blocks]] as const;
export function DesktopSettings({open,onOpenChange,generalContent,revitContent,models=[],authConfigured=false}: {
  open:boolean;onOpenChange:(open:boolean)=>void;generalContent?:ReactNode;revitContent?:ReactNode;models?:string[];authConfigured?:boolean;
}) {
  const [section,setSection]=useState<string>('general');
  if(!open)return null;
  return <section className={styles.embedded+' studio-settings-embedded'} aria-label="Settings"><div className={styles.layout}>
    <aside className={styles.sidebar}><Button variant="ghost" className={styles.backButton} onClick={()=>onOpenChange(false)}><ArrowLeft size={15}/>Back to workspace</Button><nav className={'settings-navigation '+styles.navigation} aria-label="Settings sections">{sections.map(([id,title,Icon])=><Button variant="ghost" key={id} className={'settings-nav-item '+styles.navItem} aria-pressed={section===id} onClick={()=>setSection(id)}><Icon size={15}/><span className={styles.navTitle}>{title}</span></Button>)}</nav></aside>
    <main className={'settings-content '+styles.content}><h1 className={styles.pageTitle}>{sections.find(([id])=>id===section)?.[1]}</h1>
      {section==='general'&&generalContent}
      {section==='appearance'&&<ThemeSettings motionRow={null} advancedControl={null}/>}
      {section==='account'&&<section className="provider-section"><p>Your web and desktop accounts use the same DATUMM identity provider. Browser sign-in and desktop admission are managed separately.</p>{authConfigured?<><Show when="signed-in"><UserButton showName/></Show><Show when="signed-out"><SignInButton mode="modal"><Button>Sign in to DATUMM</Button></SignInButton></Show></>:<p role="status">Account sign-in is not configured.</p>}</section>}
      {section==='models'&&<section className="provider-section"><p>Choose a model and reasoning effort in the conversation toolbar. Model access is managed by the hosted workspace.</p>{models.length?<ul>{models.map(model=><li key={model}>{model}</li>)}</ul>:<p>Sign in and connect to load available models.</p>}</section>}
      {section==='revit'&&revitContent}
      {section==='capabilities'&&<section className="provider-section"><p>This web workspace supports saved conversations, planning, drawing review, exports and an independently installed Revit connector. Review each exact proposal before approving changes.</p><p>Local project folders, file attachments, dictation, custom provider credentials, desktop MCP packs and queued background prompts require DATUMM Desktop. Calendar scheduling is unavailable.</p></section>}
    </main>
  </div></section>;
}
