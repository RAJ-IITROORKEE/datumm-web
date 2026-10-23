'use client';

import { Plus, Mic, MoreHorizontal } from 'lucide-react';
import type { Attachment, ProviderStatus } from '@/lib/desktop-contract';
import styles from './composer-controls.module.css';

export type ComposerSource=Attachment&{image?:string};
type Props={sources:ComposerSource[];onChange:(value:ComposerSource[])=>void;onTranscript:(text:string)=>void;disabled:boolean;nativeAvailable?:boolean;onContext:()=>void;onTools:()=>void;onSettings:()=>void;onBusy:(value:boolean)=>void;onCommand:(command:string)=>void;onSkill:(id:string)=>void;voiceOnly?:boolean;attachmentOnly?:boolean;locked?:boolean;voiceStatus?:ProviderStatus['voice']};

export function ComposerMedia({voiceOnly=false,attachmentOnly=false,onSettings}:Props){
 return <div className={styles.mediaControls+' composer-media-controls'}>
  {!voiceOnly&&<><button type="button" className={'icon-button '+styles.mediaAction} disabled aria-label="File attachments require DATUMM Desktop" title="File attachments require DATUMM Desktop"><Plus size={18}/></button><button type="button" className={'icon-button '+styles.mediaAction} aria-label="Workspace capabilities" title="Workspace capabilities" onClick={onSettings}><MoreHorizontal size={18}/></button></>}
  {!attachmentOnly&&<button type="button" className={'icon-button '+styles.mediaAction} disabled aria-label="Dictation requires DATUMM Desktop" title="Dictation requires DATUMM Desktop"><Mic size={17}/></button>}
 </div>;
}