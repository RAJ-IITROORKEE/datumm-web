import { WorkspaceEntry } from '@/components/workspace-entry';
import { getWebConfiguration } from '@/lib/web-configuration';
export default function Page(){const {account}=getWebConfiguration();return <WorkspaceEntry authConfigured={account.configured} accountReason={account.reason}/>;}
