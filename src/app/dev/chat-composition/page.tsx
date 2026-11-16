import {notFound} from 'next/navigation';
import {ChatCompositionPreview} from '@/components/dev/chat-composition-preview';
import {HarnessReplay,type RecordedReplayRun} from '@/components/dev/harness-replay';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export default async function Page(){
 if(process.env.NODE_ENV!=='development')notFound();
 let snapshot:RecordedReplayRun|null=null;
 try{snapshot=JSON.parse(await readFile(join(process.cwd(),'tests/fixtures/agui-produced-task.json'),'utf8'));}catch{}
 return <><ChatCompositionPreview/>{snapshot&&<div style={{maxWidth:960,margin:'0 auto',padding:'0 20px 32px'}}><HarnessReplay snapshot={snapshot}/></div>}</>;
}
