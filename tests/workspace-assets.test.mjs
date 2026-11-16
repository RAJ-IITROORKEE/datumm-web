import test from 'node:test';
import assert from 'node:assert/strict';
import {projectWorkspaceAssets} from '../src/lib/workspace-assets.mjs';

const scope={key:'scope-a',epoch:1,accountKey:'account-a',taskId:'task-a',sourceKey:'new:project-a'};
const plan={planId:'plan-a',version:2,fingerprint:'fp-a2'};
const hash='a'.repeat(64);
const bound=(value,changes={})=>({value,accountKey:scope.accountKey,taskId:scope.taskId,sourceKey:scope.sourceKey,...changes});
const input=changes=>({scope,snapshotTaskId:'task-a',drawings:[],loadedDrawing:null,answers:[],report:null,savedAttachmentIds:[],savedSources:[],specialists:[],draftSources:[],...changes});

test('all six kinds preserve provenance, loaded-only destinations and exact kind-specific identities',()=>{
  const rows=projectWorkspaceAssets(input({drawings:[bound({plan,current:true,briefId:'brief-a'})],loadedDrawing:bound(plan),
    answers:[bound({id:'same',title:'Room table',kind:'table',complete:false,source:{conversationIndex:0,state:'streaming',taskId:'task-a'}})],
    report:bound({supported:undefined,report:null}),savedAttachmentIds:[bound('same'),bound('missing')],savedSources:[bound({id:'same',name:'Floor scan',image:'loaded-image',mime:'image/png',bytes:0,page:1})],
    specialists:[bound({role:'report_preparer',status:'completed',ref:hash})],draftSources:[bound({id:'same',name:'Draft scan'},{taskId:null})]}));
  assert.deepEqual(rows.map(row=>row.kind),['saved-drawing','answer-output','saved-report','saved-attachment','saved-attachment','specialist-artifact','draft-attachment']);
  assert.deepEqual(rows.map(row=>row.destination.kind),['drawing','answer-output','saved-report','saved-source','unavailable','specialist-download','unavailable']);
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  assert.equal(rows[3].metadata.bytes,0); assert.equal(rows[4].title,'Saved attachment 2'); assert.deepEqual(rows[4].metadata,{attachmentId:'missing'});
  assert.equal(rows[2].provenance,'Saved task evidence'); assert.match(rows.at(-1).provenance,/Unsaved/);
  assert.equal(rows[0].id,JSON.stringify(['account-a','task-a','saved-drawing',['plan-a',2,'fp-a2']]));
});

test('answer display numbers follow answer ordinals without changing output identity',()=>{
 const answers=[{id:'task:answer:1:report',source:{taskId:'task-a',conversationIndex:1,answerNumber:1,state:'saved'}},{id:'task:answer:3:report',source:{taskId:'task-a',conversationIndex:3,answerNumber:2,state:'saved'}},{id:'legacy',source:{taskId:'task-a',conversationIndex:5,state:'partial'}}].map(value=>bound({...value,title:'Full answer'}));
 const rows=projectWorkspaceAssets(input({answers}));
 assert.deepEqual(rows.map(row=>row.provenance),['Answer 1 · saved','Answer 2 · saved','Answer 6 · partial']);
 assert.deepEqual(rows.map(row=>row.destination.outputId),answers.map(row=>row.value.id));
 assert.equal(answers[1].value.source.conversationIndex,3);
});

test('foreign snapshot, account, task, source and embedded bindings are rejected before metadata can merge',()=>{
  const sample=input({drawings:[bound({plan,current:true},{accountKey:'foreign'})],loadedDrawing:bound(plan,{taskId:'foreign'}),
    answers:[bound({id:'answer',title:'Foreign',source:{taskId:'foreign'}})],report:bound({report:null},{taskId:'foreign'}),
    savedAttachmentIds:[bound('foreign',{taskId:'foreign'})],savedSources:[bound({id:'source',name:'wrong',task:'foreign',image:'image'})],
    specialists:[bound({role:'report_preparer',status:'completed',ref:hash},{accountKey:'foreign'})],
    draftSources:[bound({id:'d1'},{taskId:null,sourceKey:'other'}),bound({id:'d2',task:'foreign'},{taskId:null}),bound({id:'d3'},{taskId:'task-a'})]});
  assert.deepEqual(projectWorkspaceAssets(sample),[]);
  assert.deepEqual(projectWorkspaceAssets({...sample,snapshotTaskId:'old'}),[]);
  const mismatched=projectWorkspaceAssets(input({savedAttachmentIds:[bound('source')],savedSources:sample.savedSources,loadedDrawing:bound(plan)}));
  assert.equal(mismatched.find(row=>row.kind==='saved-attachment').destination.kind,'unavailable');
});

test('drawings combine current and first brief, order current first, retain exact fingerprints and add loaded drawing last',()=>{
  const retained={...plan,version:1,fingerprint:'old'},different={...plan,fingerprint:'different'};
  const data=input({drawings:[bound({plan:retained,current:false,briefId:'first'}),bound({plan,current:true}),bound({plan:retained,current:true,briefId:'second'}),bound({plan:different,current:false})],loadedDrawing:bound({...plan,planId:'loaded'})});
  const before=JSON.stringify(data),rows=projectWorkspaceAssets(data);
  assert.equal(rows.length,4); assert.equal(rows[0].alternativeSelection,undefined); assert.equal(rows[0].provenance,'Current drawing');
  assert.equal(rows[2].destination.kind,'unavailable'); assert.equal(rows[2].destination.reason,'Saved drawing preview is not loaded');
  assert.equal(rows[3].destination.kind,'drawing'); assert.equal(JSON.stringify(data),before,'projection never mutates inputs');
});

test('attachment dedup keeps first accepted values and fills only absent metadata',()=>{
  const rows=projectWorkspaceAssets(input({savedAttachmentIds:[bound('id'),bound('id')],savedSources:[bound({id:'id',name:'First',bytes:0}),bound({id:'id',name:'Second',bytes:99,mime:'image/png',page:3}),bound({id:'id',sha256:'untrusted'},{accountKey:'foreign'})],draftSources:[bound({id:'id',name:'Draft',bytes:2},{taskId:null}),bound({id:'id',name:'Later',page:1},{taskId:null})]}));
  assert.equal(rows.length,2); assert.equal(rows[0].title,'First'); assert.deepEqual(rows[0].metadata,{name:'First',bytes:0,mime:'image/png',page:3,attachmentId:'id'});
  assert.equal(rows[1].title,'Draft'); assert.equal(rows[1].metadata.page,1);
});

test('concept labels stay in original drawing order when selection changes and exact identities survive',()=>{
  const first={planId:'72dbe37c-204a-4bd6-996c-e03e05674576',version:1,fingerprint:'fp-first'};
  const second={planId:'4b07b37e-24b8-44df-a1cb-44ddc40e8b74',version:2,fingerprint:'fp-second'};
  const project=current=>projectWorkspaceAssets(input({drawings:[bound({plan:first,current:current===first,briefId:'brief-first'}),bound({plan:second,current:current===second,briefId:'brief-second'})],loadedDrawing:bound(current)}));
  const rows=project(second),switched=project(first);
  assert.equal(rows[0].title,'Concept 2 · Version 2');
  assert.equal(rows[1].title,'Concept 1 · Version 1');
  assert.equal(rows[0].provenance,'Current drawing');
  assert.equal(rows[1].provenance,'Alternative drawing');
  for(const row of rows){
    assert.equal(switched.find(other=>other.id===row.id).title,row.title);
    const exact=row.metadata.planId===first.planId?first:second;
    assert.deepEqual(row.metadata,exact);
    if (row.provenance === 'Alternative drawing') assert.deepEqual(row.alternativeSelection.plan,exact); else assert.equal(row.alternativeSelection,undefined);
    assert.doesNotMatch(row.title, /72dbe37c|4b07b37e/);
  }
  assert.deepEqual(rows[0].destination,{kind:'drawing',plan:second});
});

test('evidence and unnamed input labels are readable while reference metadata and download authority remain exact',()=>{
  const rows=projectWorkspaceAssets(input({specialists:[bound({role:'report_preparer',status:'completed',ref:hash}),bound({role:'model_checker',status:'partial',ref:'raw-reference'})],savedAttachmentIds:[bound('source-id')],draftSources:[bound({id:'draft-id'},{taskId:null})]}));
  const reports=rows.filter(row=>row.kind==='specialist-artifact');
  assert.equal(reports[0].title,'Evidence report (JSON)');
  assert.equal(reports[0].provenance,'Report preparer · Completed');
  assert.equal(reports[1].provenance,'Model checker · Partial');
  assert.equal(reports[0].metadata.artifactRef,hash);
  assert.equal(reports[1].metadata.artifactRef,'raw-reference');
  assert.equal(reports[1].destination.kind,'unavailable');
  assert.equal(rows[0].title,'Saved attachment 1');
  assert.equal(rows.at(-1).title,'Draft attachment 1');
  assert.equal(rows[0].metadata.attachmentId,'source-id');
  assert.equal(rows.at(-1).metadata.attachmentId,'draft-id');
  assert.doesNotMatch(rows.map(row=>`${row.title} ${row.provenance}`).join(' '), /source-id|draft-id|raw-reference|a{64}/);
});

test('report execution ID is distinct from its root task and support absence differs from exclusion',()=>{
  const report={runId:'execution-not-task',sourceKind:'measured',source:'Retained host quantities'};
  for(const supported of [undefined,true,false]){
    const row=projectWorkspaceAssets(input({report:bound({supported,report})}))[0];
    assert.equal(row.destination.kind,supported===false?'unavailable':'saved-report'); assert.match(row.provenance,/measured/);
  }
});

test('only completed report preparer hashes receive specialist downloads; no arbitrary URL survives',()=>{
  const refs=[{role:'report_preparer',status:'completed',ref:hash},{role:'report_preparer',status:'partial',ref:'b'.repeat(64)},{role:'other',status:'completed',ref:'c'.repeat(64)},{role:'report_preparer',status:'completed',ref:'https://example.invalid/file'},{role:'report_preparer',status:'completed',ref:'A'.repeat(64)}];
  const rows=projectWorkspaceAssets(input({specialists:refs.map(value=>bound(value))}));
  assert.deepEqual(rows.map(row=>row.destination.kind),['specialist-download','unavailable','unavailable','unavailable','unavailable']);
  assert.deepEqual(rows[0].destination,{kind:'specialist-download',taskId:'task-a',sha256:hash});
});

test('specialist routing references do not become downloaded-file checksums; attachment digests remain sourced',()=>{
 const rows=projectWorkspaceAssets(input({specialists:[bound({role:'report_preparer',status:'completed',ref:hash})],savedAttachmentIds:[bound('scan')],savedSources:[bound({id:'scan',sha256:'b'.repeat(64)})]}));
 const specialist=rows.find(row=>row.kind==='specialist-artifact'),attachment=rows.find(row=>row.kind==='saved-attachment');
 assert.equal(specialist.metadata.artifactRef,hash);
 assert.equal(specialist.metadata.sha256,undefined);
 assert.equal(specialist.destination.sha256,hash);
 assert.equal(attachment.metadata.sha256,'b'.repeat(64));
});

test('draft scope has only its own unsaved source records',()=>{
  const rows=projectWorkspaceAssets(input({scope:{...scope,taskId:null},draftSources:[bound({id:'draft'},{taskId:null})],report:bound({supported:true,report:null}),loadedDrawing:bound(plan)}));
  assert.equal(rows.length,1); assert.equal(rows[0].kind,'draft-attachment');
  assert.equal(rows[0].id,JSON.stringify(['account-a',scope.sourceKey,'draft-attachment','draft']));
});


test('only a known older version of the same concept is a previous version',()=>{
 const first={planId:'a',version:1,fingerprint:'a1'},current={planId:'a',version:2,fingerprint:'a2'},other={planId:'b',version:1,fingerprint:'b1'};
 const rows=projectWorkspaceAssets(input({drawings:[bound({plan:first,current:false,briefId:'a'}),bound({plan:other,current:false,briefId:'b'}),bound({plan:current,current:true,briefId:'a'})]}));
 assert.equal(rows.find(row=>row.metadata.fingerprint==='a1').provenance,'Known previous version');
 assert.equal(rows.find(row=>row.metadata.fingerprint==='a1').alternativeSelection,undefined);
 assert.equal(rows.find(row=>row.metadata.fingerprint==='b1').provenance,'Alternative drawing');
});

test('a loaded drawing absent from candidates has no invented concept ordinal',()=>{
 const row=projectWorkspaceAssets(input({loadedDrawing:bound(plan)}))[0];assert.equal(row.title,'Saved drawing · Version 2');
});


test('an explicitly recorded alternative remains selectable when current identity is missing',()=>{
 const candidate={planId:'candidate',version:1,fingerprint:'fp'};
 const row=projectWorkspaceAssets(input({drawings:[bound({plan:candidate,current:false,briefId:'brief'})]}))[0];
 assert.equal(row.provenance,'Alternative drawing');assert.deepEqual(row.alternativeSelection.plan,candidate);
});
