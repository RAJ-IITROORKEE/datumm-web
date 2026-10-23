import { WorkspaceEntry } from '@/components/workspace-entry';
export default function Page(){return <WorkspaceEntry authConfigured={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}/>;}
