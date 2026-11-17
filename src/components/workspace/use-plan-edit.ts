'use client';
import {useRef,useState} from 'react';
import {acceptAgainNote,editBody,editPath,parseEditResult,refusalMessage,successMessage,type PlanEdit} from '@/lib/plan-edits.mjs';
import type {DrawingVersion} from '../plan-canvas';
import type {Run} from './use-workspace-state';

type Scope={key:string;generation:number};
export type PlanEditNotice={tone:'ok'|'error';text:string;/** The earlier saved version that Undo opens. */back?:number};
type Context={
  /** Capability on, a saved current drawing shown, and nothing else running. */
  allowed:boolean;designVersion:DrawingVersion|null;run:Run|null;runId:string;
  guard:{current:Scope};scopeCurrent:(token:Scope)=>boolean;
  withSelectionMutation:(operation:()=>Promise<void>)=>Promise<void>;
  api:<T>(path:string,method?:string,body?:unknown)=>Promise<T>;
  currentRun:{current:Run|null};setRun:(run:Run)=>void;
  setActionBusy:(busy:boolean)=>void;
  setDesignVersion:(value:DrawingVersion|null,token?:Scope)=>void;
  clearComparison:()=>void;clearSelection:()=>void;
};
const same=(a:{planId:string;version:number;fingerprint:string},b:{planId:string;version:number;fingerprint:string})=>a.planId===b.planId&&a.version===b.version&&a.fingerprint===b.fingerprint;

/**
 * One targeted edit at a time. The server makes the new immutable version; this makes it the
 * task's current plan the way choosing an alternative does (select on the brief, then reload the task).
 */
export function usePlanEdit(ctx:Context){
  const [record,setRecord]=useState<{key:string;generation:number;busy:boolean;notice:PlanEditNotice|null}>({key:'',generation:0,busy:false,notice:null});
  const lock=useRef(false);
  const mine=ctx.scopeCurrent(record);
  const patch=(token:Scope,next:{busy?:boolean;notice?:PlanEditNotice|null})=>{if(ctx.scopeCurrent(token))setRecord(previous=>({...(ctx.scopeCurrent(previous)?previous:{busy:false,notice:null}),...token,...next}));};

  const apply=async(edit:PlanEdit)=>{
    const base=ctx.designVersion,token={...ctx.guard.current},taskId=ctx.runId,briefId=ctx.run?.data.agent_design?.briefId;
    if(lock.current||!ctx.allowed||!base||!taskId||!briefId)return;
    lock.current=true;patch(token,{busy:true,notice:null});ctx.setActionBusy(true);
    let saved=0,finished=false;
    try{
      await ctx.withSelectionMutation(async()=>{
        const result=parseEditResult(await ctx.api<unknown>(editPath(base),'POST',editBody(base,edit)),base);
        if(!result)throw Object.assign(new Error('The server did not confirm the edit.'),{status:0});
        saved=result.version;
        const next=await ctx.api<DrawingVersion>(`variable/plans/${encodeURIComponent(result.planId)}/versions/${result.version}`);
        if(!same(next,result))throw new Error('The saved version does not match the edit.');
        const review=await ctx.api<{selectionRevision:number}>(`variable/briefs/${briefId}/alternatives`);
        await ctx.api(`variable/briefs/${briefId}/selection`,'POST',{planId:next.planId,version:next.version,fingerprint:next.fingerprint,expectedSelectionRevision:review.selectionRevision});
        const refreshed=await ctx.api<Run>('tasks/'+taskId);
        if(refreshed.id!==taskId||!refreshed.currentPlanRef||!same(refreshed.currentPlanRef,next)||(refreshed.taskVersion??0)<(ctx.currentRun.current?.taskVersion??0))throw new Error('The new version is not confirmed on the task yet.');
        finished=true;
        if(!ctx.scopeCurrent(token)||ctx.currentRun.current?.id!==taskId)return;
        ctx.setDesignVersion(next,token);ctx.clearComparison();ctx.clearSelection();ctx.setRun(refreshed);
        // The server clears the old acceptance; say so instead of leaving the person to find a stale Accept.
        const reaccept=ctx.run?.acceptance?.plan&&same(ctx.run.acceptance.plan,base);
        patch(token,{notice:{tone:'ok',text:successMessage(result,next.graph)+(reaccept?` · ${acceptAgainNote(next.version)}`:''),back:base.version}});
      });
      if(!finished&&!saved)patch(token,{notice:{tone:'error',text:'Editing is paused until the saved selection is checked. The plan is unchanged.'}});
    }catch(failure){
      const e=failure as {status?:number;message?:string;serviceCode?:string};
      patch(token,{notice:{tone:'error',text:saved?`Version ${saved} was saved, but it could not be opened here. Reload the chat to see it.`:refusalMessage({status:e.status,message:e.message,code:e.serviceCode})}});
    }finally{lock.current=false;patch(token,{busy:false});if(ctx.scopeCurrent(token))ctx.setActionBusy(false);}
  };

  /** Show another saved version of this plan. It only reads: nothing is deleted or selected. */
  const open=async(version:number)=>{
    const base=ctx.designVersion,token={...ctx.guard.current};
    if(lock.current||!base||!Number.isSafeInteger(version)||version<1)return;
    lock.current=true;patch(token,{busy:true,notice:null});
    try{
      const next=await ctx.api<DrawingVersion>(`variable/plans/${encodeURIComponent(base.planId)}/versions/${version}`);
      if(next.planId!==base.planId||next.version!==version)throw new Error('Version mismatch.');
      if(ctx.scopeCurrent(token)){ctx.setDesignVersion(next,token);ctx.clearComparison();ctx.clearSelection();}
    }catch{patch(token,{notice:{tone:'error',text:`Version ${version} could not be opened. The plan on screen is unchanged.`}});}
    finally{lock.current=false;patch(token,{busy:false});}
  };

  return {busy:mine&&record.busy,notice:mine?record.notice:null,apply,open,dismiss:()=>patch({...ctx.guard.current},{notice:null})};
}
