'use client';
import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {SignIn,useAuth} from '@clerk/nextjs';
import {authGateState} from '@/lib/auth-gate.mjs';
import {
  changeLog,graphsByVersion,isAccepted,packageAssumptions,parsePackage,type PackageRequest,
} from '@/lib/revision-package.mjs';
import type {DrawingVersion} from '../plan-canvas';
import {Button} from '../ui/button';
import {RevisionPackageView,type RevisionPackageViewProps} from './revision-package-view';
import styles from './revision-package.module.css';

type View=Omit<RevisionPackageViewProps,'onPrint'>;
type State={status:'loading'}|{status:'error';message:string}|{status:'ready';view:View};
const LOAD_FAILED='The revision package could not be loaded. Try again in a moment.';
type TaskRead={id?:string;title?:string}|null;

async function getJson(path:string,signal:AbortSignal):Promise<unknown>{
  const response=await fetch('/api/service/'+path,{signal});
  if(response.status===404)throw new Error(
    'This revision package was not found. It may belong to another account.');
  if(!response.ok)throw new Error(LOAD_FAILED);
  return response.json();
}

function isDrawing(value:unknown):value is DrawingVersion{
  const row=value as Partial<DrawingVersion>|null;
  return typeof row?.planId==='string'&&Number.isInteger(row.version)
    &&typeof row.fingerprint==='string'&&typeof row.svg==='string'&&Array.isArray(row.graph?.rooms);
}

const failed=(message:string):State=>({status:'error',message});

async function load({planId,version,taskId}:PackageRequest,signal:AbortSignal):Promise<State>{
  const base=`variable/plans/${encodeURIComponent(planId)}/versions`;
  const pkg=parsePackage(await getJson(`${base}/${version}/package`,signal));
  if(!pkg||pkg.planId!==planId||pkg.version!==version){
    return failed('This revision package is in a format this page does not recognise.');
  }
  const rootVersion=pkg.versions[0].version;
  const [first,current]=await Promise.all([
    getJson(`${base}/${rootVersion}`,signal),
    rootVersion===version?null:getJson(`${base}/${version}`,signal),
  ]);
  const last=current??first;
  if(!isDrawing(first)||!isDrawing(last)){
    return failed('The saved drawings for this package could not be read.');
  }
  // Acceptance and the title are optional: the page still works if the task cannot be read.
  const read=taskId
    ?await getJson(`tasks/${encodeURIComponent(taskId)}`,signal).catch(()=>null):null;
  const task=read&&(read as TaskRead)?.id===taskId?read as TaskRead:null;
  return {status:'ready',view:{
    title:task?.title||'Floor plan',pkg,first,last,
    log:changeLog(pkg,graphsByVersion(pkg,first.graph,last.graph)),
    accepted:isAccepted(task,last),assumptions:packageAssumptions(task,pkg),dataHref:`/api/service/${base}/${version}/package`,
  }};
}

function Frame({children}:{children:ReactNode}){
  return <main className={styles.page}><div className={styles.sheet}>{children}</div></main>;
}

function Package({request}:{request:PackageRequest}){
  const [state,setState]=useState<State>({status:'loading'}),[attempt,setAttempt]=useState(0);
  const {planId,version,taskId}=request;
  useEffect(()=>{
    const controller=new AbortController();
    setState({status:'loading'});
    load({planId,version,taskId},controller.signal).then(setState).catch(failure=>{
      if(controller.signal.aborted)return;
      setState(failed(failure instanceof Error?failure.message:LOAD_FAILED));
    });
    return()=>controller.abort();
  },[planId,version,taskId,attempt]);
  const print=useCallback(()=>window.print(),[]);
  if(state.status==='ready')return <RevisionPackageView {...state.view} onPrint={print}/>;
  return <Frame><h1>Revision package</h1>
    {state.status==='loading'
      ?<p className={styles.note} role="status">Loading the revision package…</p>
      :<div role="alert"><p className={styles.error}>{state.message}</p>
        <div className={styles.controls}>
          <Button type="button" variant="secondary" onClick={()=>setAttempt(value=>value+1)}>
            Try again</Button>
        </div></div>}
  </Frame>;
}

function SignedIn({request}:{request:PackageRequest}){
  const {isLoaded,userId}=useAuth(),gate=authGateState(true,isLoaded,userId);
  if(gate==='loading'){
    return <Frame><h1>Revision package</h1><p role="status">Loading your account…</p></Frame>;
  }
  if(gate==='signed-out'){
    const query=new URLSearchParams({plan:request.planId,version:String(request.version)});
    if(request.taskId)query.set('task',request.taskId);
    const back=`/revision-package?${query}`;
    return <Frame><h1>Sign in to open this revision package</h1>
      <SignIn routing="hash" forceRedirectUrl={back} signUpForceRedirectUrl={back}/></Frame>;
  }
  return <Package key={userId} request={request}/>;
}

const home=<a href="/">Back to workspace</a>;

type PageProps={request:PackageRequest|null;authConfigured:boolean};

/** Signed-out visitors get the normal sign-in; the plan is read only through the owner proxy. */
export function RevisionPackagePage({request,authConfigured}:PageProps){
  if(!request){
    return <Frame><h1>Revision package</h1>
      <p>This link is incomplete. Open the package from the Review screen in your workspace.</p>
      {home}</Frame>;
  }
  if(!authConfigured){
    return <Frame><h1>Account sign-in is unavailable</h1>
      <p>This DATUMM environment has not configured account sign-in, so the revision package
        cannot open here.</p>
      {home}</Frame>;
  }
  return <SignedIn request={request}/>;
}
