'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {SignIn,useAuth,useUser} from '@clerk/nextjs';
import {Check,Monitor,ShieldCheck} from 'lucide-react';
import {approveAuthorization,authorizationGate,authorizationReturnUrl,reviewAuthorization,type AuthorizationState} from '@/lib/device-authorization.mjs';
import styles from './device-authorization.module.css';

type Props={request:string|null;authConfigured:boolean};

function Frame({children}:{children:React.ReactNode}) {
  return <main className={styles.page}><header className={styles.header}><a className={styles.brand} href="/"><img src="/datumm-mark.png" alt="" width={27} height={27}/>DATUMM</a></header><section className={styles.content}>{children}</section></main>;
}

function StartAgain({invalid=false}:{invalid?:boolean}) {
  return <><h1>{invalid?'Start a new connection from Revit':'This connection request has expired'}</h1><p>In Revit, open DATUMM Agent → Connect / Settings and start the connection again. Use the new browser window to review your computer.</p><a className={styles.secondary} href="/">Back to workspace</a></>;
}

export function DeviceAuthorization({request,authConfigured}:Props) {
  if (!request) return <Frame><StartAgain invalid/></Frame>;
  if (!authConfigured) return <Frame><h1>Account sign-in is unavailable</h1><p>This DATUMM environment has not configured account sign-in. Device authorization cannot continue here. Contact the workspace administrator, then start a new connection from Revit.</p><a className={styles.secondary} href="/">Back to workspace</a></Frame>;
  return <AccountAuthorization request={request}/>;
}

function AccountAuthorization({request}:{request:string}) {
  const {isLoaded,userId}=useAuth();
  const gate=authorizationGate(true,isLoaded,userId);
  const returnUrl=authorizationReturnUrl(request);
  if (gate==='loading') return <Frame><h1>Connect Revit to DATUMM</h1><p role="status">Loading your account…</p></Frame>;
  if (gate==='signed-out') return <Frame><h1>Sign in to connect Revit</h1><p>Use your DATUMM account to review the computer you started connecting from Revit.</p><SignIn routing="hash" forceRedirectUrl={returnUrl} signUpForceRedirectUrl={returnUrl} appearance={{options:{socialButtonsPlacement:'top',socialButtonsVariant:'blockButton'},elements:{socialButtons:{display:'flex',flexDirection:'column'},socialButtonsBlockButton__google:{order:-1},cardBox:{width:'100%',boxShadow:'none'},card:{background:'transparent',boxShadow:'none',border:'1px solid var(--border)'},footer:{background:'transparent'}}}}/><a className={styles.back} href="/">Back to workspace</a></Frame>;
  return <ReviewAuthorization key={`${userId}:${request}`} request={request}/>;
}

function ReviewAuthorization({request}:{request:string}) {
  const {user}=useUser();
  const [state,setState]=useState<AuthorizationState|null>(null);
  const [busy,setBusy]=useState(false);
  const [checking,setChecking]=useState(true);
  const active=useRef<AbortController|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const load=useCallback(async()=>{
    active.current?.abort();
    const controller=new AbortController();active.current=controller;
    setChecking(true);setState(null);
    try {const next=await reviewAuthorization(request,{signal:controller.signal});if (!controller.signal.aborted) setState(next);}
    catch {/* An obsolete request is intentionally discarded. */}
    finally {if (!controller.signal.aborted) setChecking(false);}
  },[request]);
  useEffect(()=>{void load();return()=>active.current?.abort();},[load]);
  useEffect(()=>{if(state?.status==='approved')heading.current?.focus();},[state?.status]);
  async function allow() {
    // Only this deliberate click authorizes the device; loading and sign-in never approve it.
    if (busy||state?.status!=='ready') return;
    const controller=new AbortController();active.current=controller;setBusy(true);
    try {const next=await approveAuthorization(request,{signal:controller.signal});if(!controller.signal.aborted)setState(next);}
    catch {/* Unmount/account changes cancel this view. */}
    finally {if(!controller.signal.aborted)setBusy(false);}
  }
  const status=state?.status;
  const authorized=status==='approved'||status==='already-approved';
  const account=user?.primaryEmailAddress?.emailAddress??user?.fullName??'your DATUMM account';
  return <Frame>{authorized?<>
    <Check className={styles.successIcon} size={30} aria-hidden="true"/>
    <h1 ref={heading} tabIndex={-1}>{status==='approved'?'Computer authorized':'Request already authorized'}</h1>
    <p role="status">{status==='approved'?'Return to Revit to check the connection, then close its connection panel before working.':'This request has already been approved. Return to Revit to check its connection. If this was unexpected, review your devices in Settings → Connections.'}</p>
    <p>You can close this browser tab. Authorization alone does not confirm an active Revit connection.</p>
    <a className={styles.primary} href="/">Open workspace</a>
  </>:status==='invalid'||status==='expired'?<StartAgain invalid={status==='invalid'}/>:<>
    <h1>Allow this computer to connect?</h1>
    <p>Continue only if you started this connection in your own Revit add-in.</p>
    <p className={styles.account}>Signed in as <strong>{account}</strong></p>
    {checking?<p className={styles.status} role="status">Checking the connection request…</p>:state?.status==='ready'?<>
      <div className={styles.device}><Monitor size={23} aria-hidden="true"/><div><span>Computer requesting access</span><strong>{state.name}</strong></div></div>
      <div className={styles.scope}><ShieldCheck size={19} aria-hidden="true"/><p>This connects the computer to your DATUMM account. Revit model changes still require separate approval of the exact proposal or an explicit scoped access grant.</p></div>
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={()=>void allow()} disabled={busy}>{busy?'Authorizing computer…':'Allow this computer'}</button><a className={styles.secondary} href="/">Cancel</a></div>
      <p className={styles.hint}>Connection requests expire after five minutes. You can revoke device access in Settings → Connections.</p>
    </>:<div className={styles.recovery}>
      <p role="alert">{status==='conflict'?'This request expired or was already authorized. Check its current status, or start a fresh connection from Revit.':status==='signed-out'?'Your sign-in session needs attention. Reload this page to sign in again, then review the request.':'The connection request could not be checked. Check your connection and try again. If this continues, contact the workspace administrator.'}</p>
      <div className={styles.actions}>{status==='signed-out'?<a className={styles.primary} href={authorizationReturnUrl(request)}>Reload this page</a>:<button type="button" className={styles.primary} onClick={()=>void load()}>Check again</button>}<a className={styles.secondary} href="/">Back to workspace</a></div>
    </div>}
  </>}</Frame>;
}
