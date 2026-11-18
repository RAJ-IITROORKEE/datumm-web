'use client';
import {useRef,useState} from 'react';
import {acceptAgainNote,editBody,editPath,parseEditResult,refusalMessage,successMessage,type PlanEdit} from '@/lib/plan-edits.mjs';
import {appliedMessage,partialMessage,parseRedlines,redlineBody,redlinePath} from '@/lib/redlines.mjs';
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

  /**
   * Saves the edits one at a time, each against the version and fingerprint the previous answer
   * returned, then selects the newest saved version once. A refusal stops the queue: what was
   * already saved stays saved and is selected. One edit is the ordinary single apply.
   */
  const save=async(edits:PlanEdit[]):Promise<{applied:number;error:string}>=>{
    const base=ctx.designVersion,token={...ctx.guard.current},taskId=ctx.runId,briefId=ctx.run?.data.agent_design?.briefId;
    const outcome={applied:0,error:''};
    if(lock.current||!ctx.allowed||!base||!taskId||!briefId||!edits.length)return outcome;
    lock.current=true;patch(token,{busy:true,notice:null});ctx.setActionBusy(true);
    let saved=0,finished=false;
    try{
      await ctx.withSelectionMutation(async()=>{
        let result:ReturnType<typeof parseEditResult>=null,at:{planId:string;version:number;fingerprint:string}=base,stop:unknown=null;
        for(const edit of edits){
          try{
            const answer=parseEditResult(await ctx.api<unknown>(editPath(at),'POST',editBody(at,edit)),at);
            if(!answer)throw Object.assign(new Error('The server did not confirm the edit.'),{status:0});
            result=answer;at=answer;saved=answer.version;outcome.applied++;
          }catch(failure){stop=failure;break;}
        }
        if(!result)throw stop;
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
        const tail=reaccept?` · ${acceptAgainNote(next.version)}`:'';
        if(stop){
          const e=stop as {status?:number;message?:string;serviceCode?:string};
          outcome.error=partialMessage(outcome.applied,edits.length,next.version,refusalMessage({status:e.status,message:e.message,code:e.serviceCode}));
          patch(token,{notice:{tone:'error',text:outcome.error+tail}});
        }else patch(token,{notice:{tone:'ok',text:(edits.length>1?appliedMessage(outcome.applied,next.version):successMessage(result,next.graph))+tail,back:base.version}});
      });
      if(!finished&&!saved){outcome.error='Editing is paused until the saved selection is checked. The plan is unchanged.';patch(token,{notice:{tone:'error',text:outcome.error}});}
    }catch(failure){
      const e=failure as {status?:number;message?:string;serviceCode?:string};
      outcome.error=saved?`Version ${saved} was saved, but it could not be opened here. Reload the chat to see it.`:refusalMessage({status:e.status,message:e.message,code:e.serviceCode});
      patch(token,{notice:{tone:'error',text:outcome.error}});
    }finally{lock.current=false;patch(token,{busy:false});if(ctx.scopeCurrent(token))ctx.setActionBusy(false);}
    return outcome;
  };
  const apply=async(edit:PlanEdit)=>{await save([edit]);};

  /** Read one page image against the plan on screen. A read changes nothing. */
  const readRedlines=async(drawing:DrawingVersion,source:{image:string;pageText?:string})=>{
    const result=parseRedlines(await ctx.api<unknown>(redlinePath(drawing),'POST',redlineBody(drawing,source)),drawing);
    if(!result)throw Object.assign(new Error('The server answer was not a redline list.'),{status:0});
    return result;
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

  return {busy:mine&&record.busy,notice:mine?record.notice:null,apply,applyMany:save,readRedlines,open,dismiss:()=>patch({...ctx.guard.current},{notice:null})};
}
