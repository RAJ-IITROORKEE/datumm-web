'use client';
import { SignIn, useAuth } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { authGateState } from '@/lib/auth-gate.mjs';
import { Workspace } from './workspace';
function SignInGate(){return <Dialog open modal><DialogPortal><DialogOverlay className="bg-background/70 backdrop-blur-md"/><DialogContent showCloseButton={false} className="w-auto max-w-[calc(100%-2rem)] sm:max-w-fit border-0 bg-transparent p-0 shadow-none" aria-modal="true" onEscapeKeyDown={e=>e.preventDefault()} onInteractOutside={e=>e.preventDefault()} onPointerDownOutside={e=>e.preventDefault()}><DialogTitle className="sr-only">Sign in to DATUMM</DialogTitle><DialogDescription className="sr-only">Sign in to open your DATUMM workspace.</DialogDescription><SignIn routing="hash"/></DialogContent></DialogPortal></Dialog>;}
function AccountWorkspace(){const {userId,isLoaded}=useAuth(),gate=authGateState(true,isLoaded,userId);return gate==='open'?<Workspace key={userId} authConfigured/>:gate==='loading'?<p role="status">Loading your DATUMM account...</p>:<SignInGate/>;}
export function WorkspaceEntry({authConfigured}:{authConfigured:boolean}){return authConfigured?<AccountWorkspace/>:<Workspace authConfigured={false}/>;}
