import type {Metadata} from 'next';
import {DeviceAuthorization} from '@/components/connections/device-authorization';
import {authorizationRequest} from '@/lib/device-authorization.mjs';
import {getWebConfiguration} from '@/lib/web-configuration';

export const metadata:Metadata={title:'Connect Revit — DATUMM',robots:{index:false,follow:false},referrer:'no-referrer'};

export default async function ConnectPage({searchParams}:{searchParams:Promise<{request?:string|string[]}>}) {
  const request=authorizationRequest((await searchParams).request);
  return <DeviceAuthorization request={request} authConfigured={getWebConfiguration().account.configured}/>;
}
