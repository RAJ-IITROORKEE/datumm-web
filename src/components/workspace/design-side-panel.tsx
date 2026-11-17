'use client';
import {useId,type KeyboardEvent,type ReactNode} from 'react';
import {statusLabel,type CheckStatus} from '@/lib/plan-checks.mjs';
import styles from './design-side-panel.module.css';

export type DesignSideTab='details'|'checks';
const tabs:{id:DesignSideTab;label:string}[]=[{id:'details',label:'Details'},{id:'checks',label:'Checks'}];

/** Two tabs inside the existing Properties drawer, so the work area gains no permanent column. */
export function DesignSidePanel({tab,onTab,status,details,checks}:{tab:DesignSideTab;onTab:(tab:DesignSideTab)=>void;status?:CheckStatus;details:ReactNode;checks:ReactNode}){
  const id=useId();
  const move=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
    if(next<0)return;
    event.preventDefault();onTab(tabs[next].id);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-tab="${tabs[next].id}"]`)?.focus();
  };
  return <div className={styles.panel}>
    <div className={styles.tabs} role="tablist" aria-label="Design side panel">
      {tabs.map((item,index)=><button key={item.id} type="button" role="tab" id={`${id}-${item.id}`} data-tab={item.id} aria-selected={tab===item.id} aria-controls={`${id}-${item.id}-panel`} tabIndex={tab===item.id?0:-1} onClick={()=>onTab(item.id)} onKeyDown={event=>move(event,index)}>
        {item.label}{item.id==='checks'&&status&&<span className={styles.dot} data-status={status} role="img" aria-label={statusLabel(status)}/>}
      </button>)}
    </div>
    <div role="tabpanel" id={`${id}-details-panel`} aria-labelledby={`${id}-details`} hidden={tab!=='details'}>{details}</div>
    <div role="tabpanel" id={`${id}-checks-panel`} aria-labelledby={`${id}-checks`} hidden={tab!=='checks'}>{checks}</div>
  </div>;
}
