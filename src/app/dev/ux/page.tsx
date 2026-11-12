import {notFound} from 'next/navigation';
import {UxPreview} from '@/components/dev/ux-preview';

export default function Page() {
  if(process.env.NODE_ENV !== 'development') notFound();
  return <UxPreview/>;
}
