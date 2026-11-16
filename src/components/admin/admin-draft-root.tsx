'use client';
import { useAuth } from '@clerk/nextjs';
import { useRef, type ReactNode } from 'react';
import { AdminConfigProvider } from './form';

/** Inert until an authenticated, server-authorized admin shell activates it. */
export function AdminDraftRoot({children}:{children:ReactNode}) {
  const auth=useAuth();
  const lastAccount=useRef<string|null>(null);
  if(auth.isLoaded)lastAccount.current=auth.userId;
  const accountId=auth.isLoaded ? auth.userId : lastAccount.current;
  return <AdminConfigProvider key={accountId ?? 'signed-out'} accountId={accountId} deferred>{children}</AdminConfigProvider>;
}
