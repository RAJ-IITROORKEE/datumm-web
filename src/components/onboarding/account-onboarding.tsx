'use client';

import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {UserButton} from '@clerk/nextjs';
import {ArrowLeft,ArrowRight,Check,Download,Loader2,Monitor,RefreshCw} from 'lucide-react';
import installerRelease from '../../../public/downloads/release.json';
import {DOMAINS,USE_CASE_GROUPS,type OnboardingProfile,type OnboardingStep,type ProfileInput} from '@/lib/onboarding-profile.mjs';
import styles from './onboarding.module.css';

type ProfileResponse={profile:OnboardingProfile|null;name?:string};
type FieldErrors=Partial<Record<'name'|'domain'|'useCases',string>>;
const emptyProfile:ProfileInput={name:'',domain:'',useCases:[],step:'profile'};

async function profileRequest(input?:ProfileInput,signal?:AbortSignal):Promise<ProfileResponse> {
  const response=await fetch('/api/account/profile',{method:input?'PUT':'GET',credentials:'same-origin',cache:'no-store',headers:input?{'Content-Type':'application/json'}:undefined,body:input?JSON.stringify(input):undefined,signal});
  const data=await response.json().catch(()=>null);
  if (!response.ok||!data) throw Error(typeof data?.detail==='string'?data.detail:'Your profile is unavailable. Check your connection and try again.');
  return data;
}

function fieldErrors(value:ProfileInput,profile:boolean,interests:boolean):FieldErrors {
  const errors:FieldErrors={};
  if(profile) {
    if(!value.name.trim())errors.name='Enter the name you want to use in DATUMM.';
    else if(value.name.length>100||/[\u0000-\u001f\u007f]/.test(value.name))errors.name='Use a name of 100 characters or fewer, without line breaks.';
    if(!DOMAINS.some(([id])=>id===value.domain))errors.domain='Choose your professional domain.';
  }
  if(interests&&!value.useCases.length)errors.useCases='Select at least one interest to continue.';
  return errors;
}

function ProfileFields({value,onChange,errors={}}:{value:ProfileInput;onChange:(value:ProfileInput)=>void;errors?:FieldErrors}) {
  return <div className={styles.fields}>
    <label htmlFor="datumm-profile-name"><span id="datumm-name-label">Your name</span><input id="datumm-profile-name" aria-labelledby="datumm-name-label" autoComplete="name" dir="auto" maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name?'datumm-name-error':undefined} value={value.name} onChange={event=>onChange({...value,name:event.target.value})} placeholder="What should we call you?"/>{errors.name&&<span id="datumm-name-error" className={styles.error}>{errors.name}</span>}</label>
    <label htmlFor="datumm-profile-domain"><span id="datumm-domain-label">Professional domain</span><select id="datumm-profile-domain" aria-labelledby="datumm-domain-label" required aria-invalid={Boolean(errors.domain)} aria-describedby={`datumm-domain-hint${errors.domain?' datumm-domain-error':''}`} value={value.domain} onChange={event=>onChange({...value,domain:event.target.value})}><option value="" disabled>Select your field</option>{DOMAINS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>{errors.domain&&<span id="datumm-domain-error" className={styles.error}>{errors.domain}</span>}</label>
    <p id="datumm-domain-hint" className={styles.hint}>Your discipline helps us understand your work. You can change it in Settings.</p>
  </div>;
}

function UseCaseFields({value,onChange,error}:{value:ProfileInput;onChange:(value:ProfileInput)=>void;error?:string}) {
  return <div className={styles.useCases} role="group" aria-label="Your interests" aria-invalid={Boolean(error)} aria-describedby={`datumm-interests-hint${error?' datumm-interests-error':''}`} tabIndex={error?-1:undefined}><p id="datumm-interests-hint" className={styles.hint}>Select at least one interest. You can choose more than one.</p>{error&&<p id="datumm-interests-error" className={styles.error}>{error}</p>}{USE_CASE_GROUPS.map(group=><fieldset key={group.label}><legend>{group.label}</legend><div className={styles.options}>{group.options.map(([id,label])=><label key={id} className={styles.option} data-selected={value.useCases.includes(id)}><input type="checkbox" checked={value.useCases.includes(id)} onChange={event=>onChange({...value,useCases:event.target.checked?[...value.useCases,id]:value.useCases.filter(item=>item!==id)})}/><span>{label}</span></label>)}</div></fieldset>)}</div>;
}

function ConnectorStep() {
  const [checking,setChecking]=useState(false),[message,setMessage]=useState(''),[online,setOnline]=useState(false);
  async function checkConnection() {
    setChecking(true);setMessage('');
    try {
      const response=await fetch('/api/service/devices',{cache:'no-store',credentials:'same-origin'});
      if(!response.ok) throw Error('Connection status is unavailable. Try again in the workspace.');
      const devices:unknown=await response.json();
      if(!Array.isArray(devices)) throw Error('Connection status is unavailable. Try again in the workspace.');
      const connected=devices.some(device=>device.online===true);
      setOnline(connected);setMessage(connected?'A Revit device is online. Select its model in the workspace before a native task.':'No Revit device is online yet. Finish setup in Revit, then check again.');
    } catch(error) {setOnline(false);setMessage(error instanceof Error?error.message:'Could not check your connection.');}
    finally {setChecking(false);}
  }
  return <div className={styles.connector}>
    <div className={styles.connectionIntro}><Monitor size={26} aria-hidden/><div><h3>Bring your Revit model into the conversation</h3><p>Connect when you’re ready for model context and native tasks. Ask questions and plan on the web without it.</p></div></div>
    <ol className={styles.installSteps}><li>Install the DATUMM plugin on Windows x64 with Revit 2026.</li><li>Open a project in Revit, then DATUMM Agent → Connection Settings.</li><li>Choose Sign in with browser and authorize your computer.</li></ol>
    <a className={styles.primary} href={installerRelease.file}><Download size={16} aria-hidden/>Download Revit plugin</a>
    <p className={styles.hint}>{installerRelease.version} · unsigned development build · <a href={installerRelease.checksumUrl}>SHA-256 checksum</a></p>
    <div className={styles.connectionCheck}><button className={styles.secondary} type="button" disabled={checking} onClick={()=>void checkConnection()}>{checking?<Loader2 className={styles.spin} size={15} aria-hidden/>:<RefreshCw size={15} aria-hidden/>}Check connection</button>{online&&<span className={styles.connected}><Check size={14} aria-hidden/>Device online</span>}</div>
    <p className={styles.status} role="status">{message}</p>
    <p className={styles.hint}>Downloading does not connect Revit. Native changes always need your explicit approval in the workspace.</p>
  </div>;
}

export function AccountOnboarding({initial,onComplete,accountControl=<UserButton/>,saveProfile=profileRequest}:{initial:ProfileInput;onComplete:()=>void;accountControl?:ReactNode;saveProfile?:(input:ProfileInput)=>Promise<unknown>}) {
  const [value,setValue]=useState(initial),[step,setStep]=useState<OnboardingStep>(initial.step==='complete'?'profile':initial.step),[saving,setSaving]=useState(false),[error,setError]=useState(''),[errors,setErrors]=useState<FieldErrors>({});
  const heading=useRef<HTMLHeadingElement>(null),form=useRef<HTMLFormElement>(null),failure=useRef<HTMLParagraphElement>(null),savePending=useRef(false);
  useEffect(()=>{heading.current?.focus();},[step]);
  useEffect(()=>{if(Object.keys(errors).length)form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[errors]);
  useEffect(()=>{if(error)failure.current?.focus();},[error]);
  const index=step==='profile'?0:step==='use-cases'?1:2;
  async function save(next:OnboardingStep) {
    if(savePending.current)return;
    const invalid=fieldErrors(value,index===0,index===1);
    setErrors(invalid);
    if(Object.keys(invalid).length)return;
    savePending.current=true;
    setSaving(true);setError('');
    try {await saveProfile({...value,step:next});if(next==='complete')onComplete();else {setStep(next);setValue(current=>({...current,step:next}));}}
    catch(error) {setError(error instanceof Error?error.message:'Your progress could not be saved. Try again.');}
    finally {savePending.current=false;setSaving(false);}
  }
  function submit(event:FormEvent) {event.preventDefault();void save(index===0?'use-cases':index===1?'connector':'complete');}
  function change(next:ProfileInput){setValue(next);setErrors({});setError('');}
  return <main className={styles.page}>
    <header className={styles.header}><a href="/" className={styles.brand}><img src="/datumm-mark.png" alt="" width={25} height={25}/>DATUMM</a>{accountControl}</header>
    <div className={styles.layout}>
      <aside className={styles.aside}><h2>A little context.<br/>A better place to start.</h2><p>Make room for your next idea, from an early brief to the model in Revit.</p><ol className={styles.stepper} aria-label="Account setup">{['About you','Your work','Connect Revit'].map((label,item)=><li key={label} aria-current={index===item?'step':undefined} data-active={index===item} data-complete={index>item}><span>{index>item?<Check size={13} aria-hidden/>:item+1}</span><div>{label}{item===2&&<small>Optional</small>}</div></li>)}</ol><p className={styles.asideNote}>Your workspace is personal.<br/>Your Revit changes stay in your control.</p></aside>
      <section className={styles.content} aria-labelledby="onboarding-heading">
        <div className={styles.contentHeading}><span className={styles.stepCount}>Step {index+1} of 3</span><h1 id="onboarding-heading" ref={heading} tabIndex={-1}>{index===0?'Let’s make this your workspace.':index===1?'What brings you to DATUMM?':'Connect Revit, when you’re ready.'}</h1><p>{index===0?'Start with your name and the field you work in.':index===1?'Choose the work you’re interested in. Select all that fit.':'You can set this up now or come back to it in Settings.'}</p></div>
        <form ref={form} noValidate onSubmit={submit} className={styles.form} aria-busy={saving}>
          <fieldset disabled={saving} className={styles.formBody}>{index===0?<ProfileFields value={value} onChange={change} errors={errors}/>:index===1?<><UseCaseFields value={value} onChange={change} error={errors.useCases}/><p className={styles.hint}>These are interests, not a list of enabled features. Available tools depend on your workspace and Revit connection.</p></>:<ConnectorStep/>}</fieldset>
          {error&&<p ref={failure} tabIndex={-1} className={styles.error} role="alert">{error} Your entries are still here. Try {index===2?'Open workspace':'Continue'} again.</p>}
          <footer className={styles.actions}>
            {index>0?<button type="button" className={styles.back} disabled={saving} onClick={()=>{if(savePending.current)return;setStep(index===2?'use-cases':'profile');setError('');setErrors({});}}><ArrowLeft size={15} aria-hidden/>Back</button>:<span className={styles.hint}>Saved to your account as you continue.</span>}
            <div className={styles.actionEnd}>{index===1&&<span className={styles.selectionCount} aria-live="polite">{value.useCases.length} selected</span>}{index===2&&<button className={styles.back} type="button" disabled={saving} onClick={()=>void save('complete')}>Skip for now</button>}<button className={styles.primary} type="submit" disabled={saving}>{saving?<><Loader2 className={styles.spin} size={16} aria-hidden/>Saving…</>:<>{index===2?'Open workspace':'Continue'}<ArrowRight size={16} aria-hidden/></>}</button></div>
          </footer>
        </form>
      </section>
    </div>
  </main>;
}

export function AccountOnboardingGate({children}:{children:ReactNode}) {
  const [state,setState]=useState<'loading'|'onboard'|'ready'|'error'>('loading'),[initial,setInitial]=useState<ProfileInput>(emptyProfile),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      setState('loading');
      try {
        const data=await profileRequest(undefined,controller.signal);
        if(data.profile?.completedAt){setState('ready');return;}
        if(!data.profile) {
          // Returning users keep their workspace and saved tasks; setup is available in Account settings.
          const history=await fetch('/api/service/runs',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
          if(history.ok){const runs:unknown=await history.json();if(Array.isArray(runs)&&runs.length){setState('ready');return;}}
        }
        setInitial(data.profile??{...emptyProfile,name:data.name??''});setState('onboard');
      } catch(error){if(controller.signal.aborted)return;setError(error instanceof Error?error.message:'Your account profile is unavailable.');setState('error');}
    })();
    return ()=>controller.abort();
  },[attempt]);
  if(state==='ready')return children;
  if(state==='onboard')return <AccountOnboarding initial={initial} onComplete={()=>setState('ready')}/>;
  return <main className={styles.loading}><img src="/datumm-mark.png" alt="DATUMM" width={32} height={32}/>{state==='loading'?<p role="status">Opening your workspace…</p>:<><h1>Your profile is temporarily unavailable</h1><p role="alert">{error}</p><div className={styles.actionEnd}><button className={styles.secondary} onClick={()=>setAttempt(value=>value+1)}>Try again</button><button className={styles.primary} onClick={()=>setState('ready')}>Continue to workspace</button></div><p className={styles.hint}>Setup hasn’t been marked complete. You can return to your profile in Settings.</p></>}</main>;
}

/** Personal profile fields only. Clerk continues to own identity, security and sessions. */
export function AccountProfileEditor() {
  const [value,setValue]=useState<ProfileInput>(emptyProfile),[loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[attempt,setAttempt]=useState(0),[errors,setErrors]=useState<FieldErrors>({});
  const form=useRef<HTMLFormElement>(null),failure=useRef<HTMLParagraphElement>(null),savePending=useRef(false);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setLoaded(false);setError('');void profileRequest(undefined,controller.signal).then(data=>{if(controller.signal.aborted)return;setValue(data.profile??{...emptyProfile,name:data.name??''});setLoaded(true);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Your profile could not be loaded. Try again.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[attempt]);
  useEffect(()=>{if(Object.keys(errors).length)form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[errors]);
  useEffect(()=>{if(error)failure.current?.focus();},[error]);
  async function save(event:FormEvent){event.preventDefault();if(savePending.current)return;const invalid=fieldErrors(value,true,true);setErrors(invalid);setSaved(false);if(Object.keys(invalid).length)return;savePending.current=true;setSaving(true);setError('');try {await profileRequest({...value,step:'complete'});setSaved(true);}catch(error){setError(error instanceof Error?error.message:'Your profile could not be saved.');}finally{savePending.current=false;setSaving(false);}}
  function change(next:ProfileInput){setValue(next);setSaved(false);setErrors({});setError('');}
  if(loading)return <p role="status" className={styles.hint}>Loading your profile…</p>;
  if(!loaded)return <div className={styles.editor}><p role="alert" className={styles.error}>{error}</p><button type="button" className={styles.secondary} onClick={()=>setAttempt(value=>value+1)}>Reload profile</button></div>;
  return <form ref={form} noValidate onSubmit={event=>void save(event)} className={styles.editor} aria-busy={saving}><fieldset disabled={saving} className={styles.formBody}><ProfileFields value={value} onChange={change} errors={errors}/><h3>Your interests</h3><p className={styles.hint}>These help describe your work; they do not enable tools.</p><UseCaseFields value={value} onChange={change} error={errors.useCases}/></fieldset>{error&&<p ref={failure} tabIndex={-1} role="alert" className={styles.error}>{error} Your entries are still here. Try Save profile again.</p>}<div className={styles.actionEnd}><span role="status" className={styles.hint}>{saved?'Profile saved to your account.':''}</span><button type="submit" className={styles.primary} disabled={saving}>{saving?'Saving…':'Save profile'}</button></div></form>;
}
