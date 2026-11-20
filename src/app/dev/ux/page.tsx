import {notFound} from 'next/navigation';
import {UxPreview} from '@/components/dev/ux-preview';
import {WorkAreaPreview} from '@/components/dev/work-area-preview';

export default async function Page({searchParams}: {searchParams: Promise<{surface?: string}>}) {
  if(process.env.NODE_ENV !== 'development') notFound();
  if((await searchParams).surface === 'work-area') return <WorkAreaPreview/>;
  return <UxPreview/>;
}
