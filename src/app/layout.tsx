import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '@fontsource-variable/inter';
import './globals.css';
import './foundation.css';
import {appearanceBootstrap} from '@/lib/appearance';
import {getWebConfiguration} from '@/lib/web-configuration';
import {AdminDraftRoot} from '@/components/admin/admin-draft-root';
export const metadata: Metadata = { title:'DATUMM — Design with intent', description:'Your architectural agent, connected to Revit.', icons:{icon:'/datumm-mark.png',apple:'/datumm-mark.png'} };
export default function RootLayout({children}:{children:React.ReactNode}) {
 const configured=getWebConfiguration().account.configured;
 const content=<html lang="en" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/></head><body>{configured?<AdminDraftRoot>{children}</AdminDraftRoot>:children}</body></html>;
 return configured ? <ClerkProvider appearance={{variables:{colorPrimary:'var(--primary)',colorBackground:'var(--panel)',colorForeground:'var(--ink)',colorMutedForeground:'var(--text)',colorInput:'var(--composer)',fontFamily:'var(--font-sans)',borderRadius:'10px'},elements:{cardBox:{boxShadow:'none'}}}}>{content}</ClerkProvider> : content;
}
