import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { isAdminEmail } from '@/lib/admin-access.mjs';
import {getWebConfiguration} from '@/lib/web-configuration';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'DATUMM Admin', robots: { index: false, follow: false } };

// First gate: primary verified email in ADMIN_EMAILS. The backend enforces admin again by Clerk subject.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!getWebConfiguration().account.configured) notFound();
  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  if (!email || email.verification?.status !== 'verified' || !isAdminEmail(email.emailAddress, process.env.ADMIN_EMAILS)) notFound();
  return <div className="admin-root"><AdminShell email={email.emailAddress} accountId={user.id}>{children}</AdminShell></div>;
}
