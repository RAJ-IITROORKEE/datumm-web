import type {Metadata} from 'next';
import {RevisionPackagePage} from '@/components/review/revision-package-page';
import {packageRequest} from '@/lib/revision-package.mjs';
import {getWebConfiguration} from '@/lib/web-configuration';

export const metadata:Metadata={
  title:'Revision package — DATUMM',robots:{index:false,follow:false},referrer:'no-referrer',
};

type Query=Promise<Record<string,string|string[]|undefined>>;

export default async function Page({searchParams}:{searchParams:Query}) {
  const request=packageRequest(await searchParams);
  const {account}=getWebConfiguration();
  return <RevisionPackagePage request={request} authConfigured={account.configured}/>;
}
