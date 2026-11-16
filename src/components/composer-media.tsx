'use client';

import { Plus, Mic, Folder, Paperclip, Settings2 } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import type { Attachment, ProviderStatus } from '@/lib/desktop-contract';
import styles from './composer-controls.module.css';

export type ComposerSource=Attachment&{image?:string};
type Props={sources:ComposerSource[];onChange:(value:ComposerSource[])=>void;onTranscript:(text:string)=>void;disabled:boolean;nativeAvailable?:boolean;onContext:()=>void;onTools:()=>void;onSettings:()=>void;onBusy:(value:boolean)=>void;onCommand:(command:string)=>void;onSkill:(id:string)=>void;voiceOnly?:boolean;attachmentOnly?:boolean;locked?:boolean;voiceStatus?:ProviderStatus['voice']};

export function ComposerMedia({voiceOnly=false,attachmentOnly=false,onSettings,onContext}:Props){
 return <div className={styles.mediaControls+' composer-media-controls'}>
  {!voiceOnly&&<DropdownMenu>
   <DropdownMenuTrigger asChild><button type="button" className={'icon-button '+styles.mediaAction} aria-label="Add" title="Add"><Plus size={16} strokeWidth={1.9} aria-hidden="true"/></button></DropdownMenuTrigger>
   <DropdownMenuContent side="top" align="start" className={styles.addMenu}>
    <DropdownMenuLabel>Add</DropdownMenuLabel>
    <DropdownMenuPrimitive.Item disabled className={styles.addMenuItem} textValue="File attachments require DATUMM Desktop">
     <Paperclip size={16} strokeWidth={1.9} aria-hidden="true"/><span>File attachments<small>Requires DATUMM Desktop</small></span>
    </DropdownMenuPrimitive.Item>
    <DropdownMenuSeparator/>
    <DropdownMenuPrimitive.Item className={styles.addMenuItem} onSelect={onContext}><Folder size={16} strokeWidth={1.9} aria-hidden="true"/>Project context</DropdownMenuPrimitive.Item>
    <DropdownMenuPrimitive.Item className={styles.addMenuItem} onSelect={onSettings}><Settings2 size={16} strokeWidth={1.9} aria-hidden="true"/>Workspace capabilities</DropdownMenuPrimitive.Item>
   </DropdownMenuContent>
  </DropdownMenu>}
  {!attachmentOnly&&<button type="button" className={'icon-button '+styles.mediaAction} disabled aria-label="Dictation requires DATUMM Desktop" title="Dictation requires DATUMM Desktop"><Mic size={16} strokeWidth={1.9} aria-hidden="true"/></button>}
 </div>;
}
