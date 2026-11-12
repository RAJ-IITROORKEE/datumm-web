import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '@fontsource-variable/inter';
import './globals.css';
import './foundation.css';
import {appearanceBootstrap} from '@/lib/appearance';
export const metadata: Metadata = { title:'DATUMM — Design with intent', description:'Your architectural agent, connected to Revit.', icons:{icon:'/datumm-mark.png',apple:'/datumm-mark.png'} };
export default function RootLayout({children}:{children:React.ReactNode}) {
 const content=<html lang="en" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/></head><body>{children}</body></html>;
 return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider appearance={{variables:{colorPrimary:'#e8e8e9',colorBackground:'#1c1c1e',fontFamily:'Inter Variable, Inter, sans-serif',borderRadius:'7px'},elements:{cardBox:{boxShadow:'none'}}}}>{content}</ClerkProvider> : content;
}
