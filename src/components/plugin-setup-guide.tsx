import {useState} from 'react';
import {Download, RefreshCw} from 'lucide-react';
import installerRelease from '../../public/downloads/release.json';
import {Button} from './ui/button';
import {Card} from './vendor/affectui/card-clean';

/** Chat guidance shown while Build is selected and no Revit device is online. The parent decides visibility via needsPluginSetup. */
export function PluginSetupGuide({onCheck,onUsePlan}:{onCheck:()=>Promise<unknown>;onUsePlan:()=>void}){
 const [checking,setChecking]=useState(false),[checked,setChecked]=useState(false);
 const check=async()=>{setChecking(true);try{await onCheck();setChecked(true);}finally{setChecking(false);}};
 return <Card as="section" aria-label="Revit plugin setup" className="mx-auto my-3 w-full max-w-[672px] text-[13px] leading-5">
  <h2 className="text-[14px] font-medium leading-5 text-[var(--ink)]">Build needs the DATUMM Revit plugin</h2>
  <p className="text-[13px] leading-5 text-[var(--text)]">No Revit device is connected to your account, so DATUMM cannot change your model yet.</p>
  <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-5 text-[var(--text)]">
   <li>Download and install the plugin (Windows x64, Revit 2026).</li>
   <li>Open Revit and your project.</li>
   <li>Go to the DATUMM Agent tab and open Connection Settings.</li>
   <li>Choose Sign in with browser, then authorize your computer here when prompted.</li>
   <li>Come back and check the connection. This card goes away once your device is online.</li>
  </ol>
  <div className="flex flex-wrap gap-2">
   <Button asChild><a href={installerRelease.file}><Download size={15} aria-hidden/>Download the DATUMM Revit plugin</a></Button>
   <Button variant="secondary" disabled={checking} onClick={()=>void check()}><RefreshCw size={15} aria-hidden/>Check connection again</Button>
   <Button variant="ghost" onClick={onUsePlan}>Continue in Plan mode</Button>
  </div>
  <p className="text-xs leading-5 text-[var(--muted)]">Version {installerRelease.version} · unsigned development build · <a className="underline underline-offset-4" href={installerRelease.checksumUrl}>SHA-256 checksum</a></p>
  <p role="status" className="text-xs leading-5 text-[var(--text)]">{checking?'Checking connection…':checked?'Still no online device. Finish the steps in Revit, then check again.':''}</p>
 </Card>;
}
