'use client';
import { SignIn, useAuth } from '@clerk/nextjs';
import { authGateState } from '@/lib/auth-gate.mjs';
import { Workspace } from './workspace';
import { AccountOnboardingGate } from './onboarding/account-onboarding';
import styles from './onboarding/onboarding.module.css';
function SignInGate(){return <main className={styles.signIn}><a href="/" className={styles.brand}><img src="/datumm-mark.png" alt="" width={27} height={27}/>DATUMM</a><div className={styles.signInContent}><h1>A workspace for your next idea.</h1><p>Ask, plan and review. Bring Revit along when you’re ready.</p><SignIn routing="hash" fallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" appearance={{options:{socialButtonsPlacement:'top',socialButtonsVariant:'blockButton'},elements:{socialButtons:{display:'flex',flexDirection:'column'},socialButtonsBlockButton__google:{order:-1},cardBox:{width:'100%',boxShadow:'none'},card:{background:'transparent',boxShadow:'none',border:'1px solid var(--border)'},footer:{background:'transparent'}}}}/><p className={styles.pricingLink}>Start on the free tier. <a href="/pricing">Explore plans</a></p></div></main>;}
function AccountWorkspace(){const {userId,isLoaded}=useAuth(),gate=authGateState(true,isLoaded,userId);return gate==='open'?<AccountOnboardingGate key={userId}><Workspace key={userId} accountKey={userId??undefined} authConfigured/></AccountOnboardingGate>:gate==='loading'?<p role="status">Loading your DATUMM account...</p>:<SignInGate/>;}
export function WorkspaceEntry({authConfigured}:{authConfigured:boolean}){return authConfigured?<AccountWorkspace/>:<Workspace authConfigured={false}/>;}
