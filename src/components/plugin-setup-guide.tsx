import {useState} from 'react';
import {Download, RefreshCw} from 'lucide-react';
import installerRelease from '../../public/downloads/release.json';
import {Button} from './ui/button';

/** Chat guidance shown while Build is selected and no Revit device is online. The parent decides visibility via needsPluginSetup. */
export function PluginSetupGuide({onCheck,onUsePlan}:{onCheck:()=>Promise<unknown>;onUsePlan:()=>void}){
 const [checking,setChecking]=useState(false),[checked,setChecked]=useState(false);
 const check=async()=>{setChecking(true);try{await onCheck();setChecked(true);}finally{setChecking(false);}};
 return <section role="region" aria-label="Revit plugin setup" className="mx-auto my-3 w-full max-w-[720px] rounded-lg border border-border bg-card p-4 text-card-foreground">
  <h2 className="text-base font-semibold">Build needs the DATUMM Revit plugin</h2>
  <p className="mt-1 text-sm text-muted-foreground">No Revit device is connected to your account, so DATUMM cannot change your model yet.</p>
  <ol className="my-3 list-decimal space-y-1 pl-5 text-sm">
   <li>Download and install the plugin (Windows x64, Revit 2026).</li>
   <li>Open Revit and your project.</li>
   <li>Go to the DATUMM Agent tab and open Connection Settings.</li>
   <li>Choose Sign in with browser, then authorize your computer here when prompted.</li>
   <li>Come back and check the connection. This card goes away once your device is online.</li>
  </ol>
  <div className="flex flex-wrap gap-2">
   <Button asChild><a href={installerRelease.file}><Download size={16}/>Download the DATUMM Revit plugin</a></Button>
   <Button variant="secondary" disabled={checking} onClick={()=>void check()}><RefreshCw size={16}/>Check connection again</Button>
   <Button variant="ghost" onClick={onUsePlan}>Continue in Plan mode</Button>
  </div>
  <p className="mt-2 text-xs text-muted-foreground">Version {installerRelease.version} · unsigned development build · <a className="underline" href={installerRelease.checksumUrl}>SHA-256 checksum</a></p>
  <p role="status" className="mt-1 text-xs text-muted-foreground">{checking?'Checking connection…':checked?'Still no online device. Finish the steps in Revit, then check again.':''}</p>
 </section>;
}
