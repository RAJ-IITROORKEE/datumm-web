import type {Metadata} from 'next';
import {DeviceAuthorization} from '@/components/connections/device-authorization';
import {authorizationRequest} from '@/lib/device-authorization.mjs';

export const metadata:Metadata={title:'Connect Revit — DATUMM',robots:{index:false,follow:false},referrer:'no-referrer'};

export default async function ConnectPage({searchParams}:{searchParams:Promise<{request?:string|string[]}>}) {
  const request=authorizationRequest((await searchParams).request);
  return <DeviceAuthorization request={request} authConfigured={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}/>;
}
