import {notFound} from 'next/navigation';
import {ChatCompositionPreview} from '@/components/dev/chat-composition-preview';
import {HarnessReplay,type RecordedReplayRun} from '@/components/dev/harness-replay';
import {AnswerDraftReplay,type DraftRecording} from '@/components/dev/answer-draft-replay';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export default async function Page(){
 if(process.env.NODE_ENV!=='development')notFound();
 let snapshot:RecordedReplayRun|null=null;
 let drafts:{extend:DraftRecording;replace:DraftRecording}|null=null;
 try{snapshot=JSON.parse(await readFile(join(process.cwd(),'tests/fixtures/agui-produced-task.json'),'utf8'));}catch{}
 const draftFile=join(process.cwd(),'tests/fixtures/agui-answer-draft.json');
 try{drafts=JSON.parse(await readFile(draftFile,'utf8'));}catch{}
 const recordings=drafts?[
  {label:'Replay draft, checked answer continues it',snapshot:drafts.extend},
  {label:'Replay draft, checked answer replaces it',snapshot:drafts.replace},
 ]:[];
 return <>
  <ChatCompositionPreview/>
  {snapshot&&<div style={{maxWidth:960,margin:'0 auto',padding:'0 20px 32px'}}>
   <HarnessReplay snapshot={snapshot}/>
   {recordings.length>0&&<AnswerDraftReplay recordings={recordings}/>}
  </div>}
 </>;
}
