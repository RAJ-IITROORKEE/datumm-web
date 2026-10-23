'use client';
import { useAuth } from '@clerk/nextjs';
import { Workspace } from './workspace';
function AccountWorkspace(){const {userId,isLoaded}=useAuth();return isLoaded?<Workspace key={userId??'signed-out'} authConfigured/>:<p role="status">Loading your DATUMM account...</p>;}
export function WorkspaceEntry({authConfigured}:{authConfigured:boolean}){return authConfigured?<AccountWorkspace/>:<Workspace authConfigured={false}/>;}
