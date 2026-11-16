import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { parseReviewReport, reportTableCsv, MAX_REPORT_BYTES, MAX_REPORT_ROWS } from '../src/lib/review-report.mjs';

function reportHarness(timers = {setTimeout, clearTimeout}) {
  let slots=[],cursor=0,key;
  const pending=[];
  const slot=initial=>{const index=cursor++;if(!(index in slots))slots[index]=initial();return index;};
  const hooks={...React,
    useState(initial){const index=slot(()=>typeof initial==='function'?initial():initial);return [slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];},
    useRef(value){return slots[slot(()=>({current:value}))];},useId(){return 'report-test';},
    useEffect(effect,deps){const index=slot(()=>({})),value=slots[index];if(!value.deps||deps.some((dep,i)=>!Object.is(dep,value.deps[i])))pending.push(()=>{value.cleanup?.();value.cleanup=effect();value.deps=deps;});},
  };
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/review-report.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,AbortController,TextDecoder,Uint8Array,fetch,setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name.endsWith('.module.css'))return {default:{}};if(name==='@/lib/review-report.mjs')return {parseReviewReport,reportTableCsv,MAX_REPORT_BYTES};return {};}});
  const dispose=()=>{for(const value of slots)value?.cleanup?.();slots=[];};
  return {exports,render(props){const child=exports.ReviewReportPanel(props);if(child.key!==key){dispose();key=child.key;}cursor=0;return child.type(child.props);},flush(){while(pending.length)pending.shift()();},dispose,
    renderContent(report){dispose();cursor=0;const frame=exports.ReviewReportView({report,onClose(){}});return frame.props.children.type(frame.props.children.props);}};
}
const elements=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(elements)]:[];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const reportScope={key:'task-scope',epoch:1,accountKey:'account',taskId:'root-task',sourceKey:'new'};
const panelProps=changes=>({scope:reportScope,taskId:'root-task',openId:1,onClose(){},onReport(){},...changes});

// Synthetic payload using apps/domain-api/unified_reports.py::report_dataset schema 1.
const fixture = () => ({ schemaVersion: 1, runId: 'synthetic-execution', documentId: 'synthetic-document', revision: 12,
  planVersion: 3, sourceKind: 'measured', source: 'Measured native Revit host quantities', scope: 'document', status: 'completed',
  coverage: 'partial', limitations: ['Only retained contiguous evidence pages are included.'], summary: 'Synthetic quantity review.',
  boqRows: [{ recordType: 'quantity', category: 'Walls', count: 2, centerlineLengthMm: 6500, centerlineLengthKnownCount: 2, nativeAreaM2: null }],
  elements: [{ id: 'element-1', category: 'Walls', name: 'Café, "north"\nwall', heightMm: -12, hostId: null }],
  artifacts: [{ format: 'csv', available: true, runId: 'synthetic-execution', documentId: 'synthetic-document', revision: 12,
    planVersion: 3, sourceKind: 'measured', downloadPath: 'https://untrusted.invalid/private' }] });

test('retained measured rows preserve typed quantities, missing values and genuine model provenance', () => {
  const report = parseReviewReport(JSON.stringify(fixture()));
  assert.equal(report.modelRevision, 12);
  assert.equal(report.coverage, 'partial');
  assert.equal(report.boq.rows[0].count, 2);
  assert.equal(report.boq.rows[0].nativeAreaM2, null);
  assert.equal(report.elements.rows[0].id, 'element-1');
  assert.deepEqual(report.limitations, fixture().limitations);
  assert.equal('downloadPath' in report.artifacts[0], false, 'Service paths never become arbitrary browser links');
  assert.equal('artifactRevision' in report, false);
  const proposed = parseReviewReport({ schemaVersion: 1, runId: 'synthetic-plan', sourceKind: 'proposed', boqRows: [{ recordType: 'room', name: 'Study', count: 1, unit: 'm2', value: 12.5 }] });
  assert.equal(proposed.documentId, null);
  assert.equal(proposed.modelRevision, null);
  assert.equal(proposed.coverage, null);
  assert.equal(proposed.boq.rows[0].value, 12.5);
});

test('unsupported versions, mistyped quantities, malformed records and foreign artifact bindings fail closed', () => {
  for (const change of [{ schemaVersion: 2 }, { sourceKind: 'estimated' }, { revision: '12' }, { boqRows: [{ count: '2' }] },
    { elements: [null] }, { limitations: [42] }, { artifacts: [{ ...fixture().artifacts[0], runId: 'different-run' }] }]) {
    assert.throws(() => parseReviewReport({ ...fixture(), ...change }), /unsupported/);
  }
  assert.throws(() => parseReviewReport('not JSON'), /unsupported/);
  assert.throws(() => parseReviewReport({ ...fixture(), boqRows: [{ count: Infinity }] }), /unsupported/);
  for (const mismatch of [{ documentId: 'different-model' }, { revision: 13 }, { planVersion: 4 }, { sourceKind: 'verified' }]) {
    assert.throws(() => parseReviewReport({ ...fixture(), artifacts: [{ ...fixture().artifacts[0], ...mismatch }] }), /unsupported/);
  }
  const nativeView = { ...fixture().artifacts[0], format: 'native-png', revision: 11, planVersion: null, sourceKind: 'native-view' };
  const concept = { ...fixture().artifacts[0], format: 'concept', revision: null, planVersion: 2, sourceKind: 'illustrative' };
  assert.equal(parseReviewReport({ ...fixture(), artifacts: [nativeView, concept] }).artifacts.length, 2,
    'Native views and illustrations retain their distinct source bindings');
});

test('size and row limits reject rather than silently omitting rows from export', () => {
  assert.throws(() => parseReviewReport(' '.repeat(MAX_REPORT_BYTES + 1)), /2 MB/);
  assert.throws(() => parseReviewReport({ ...fixture(), boqRows: Array.from({ length: MAX_REPORT_ROWS + 1 }, () => ({})), elements: [] }), /10,000/);
});

test('typed CSV preserves negative numbers, unknown quantities, Unicode and escaped multiline text, neutralizes textual formulas', () => {
  const data = fixture();
  data.elements[0].name = ' \t=HYPERLINK("bad")';
  const report = parseReviewReport(data);
  const csv = reportTableCsv(report, 'elements');
  assert.match(csv, /^\ufeff"Run ID","Document ID","Model revision"/);
  assert.ok(csv.includes('"synthetic-execution","synthetic-document",12,3,"measured"'));
  assert.ok(csv.includes('"\' \t=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes(',-12,'), 'Typed negative measurements remain numeric');
  assert.ok(csv.endsWith('\r\n'));
  const escaped = reportTableCsv(parseReviewReport(fixture()), 'elements');
  assert.ok(escaped.includes('"Café, ""north""\nwall"'));
  assert.equal(report.elements.rows[0].name, data.elements[0].name);
  const rows = fixture();
  rows.elements = Array.from({ length: 1200 }, (_, i) => ({ id: String(i), name: '-12' }));
  assert.ok(reportTableCsv(parseReviewReport(rows), 'elements').includes('"1199"'));
  assert.ok(reportTableCsv(parseReviewReport(rows), 'elements').includes('"\'-12"'));
});

const rev=(n)=>({revisionId:`rev-${n}`,reportId:'report',revisionNumber:n,sourceExecutionId:'synthetic-execution',createdAt:'2026-11-15',contentHash:`hash-${n}`,sourcePlan:{planId:'plan',version:n,fingerprint:`fp-${n}`},sourceModel:null,changeSummary:{previousRowCount:n===1?null:1,rowCount:n,previousSourceKind:null,sourceKind:'measured',sourceChanged:false,planChanged:n>1}});
const manifest=(n)=>({schemaVersion:1,currentRevisionId:`rev-${n}`,revisions:Array.from({length:n},(_,i)=>rev(n-i)),nextCursor:null});
const detail=(n)=>({schemaVersion:1,revision:rev(n),dataset:{...fixture(),planVersion:n,artifacts:[],summary:`Revision ${n}`}});
test('saved history opens current, preserves historical view on refresh and binds its export',async()=>{
 const h=reportHarness(),calls=[],reports=[];let current=2;
 const fetcher=async(url,init)=>{calls.push({url,init});return Response.json(url.includes('?limit=20')?manifest(current):detail(Number(url.match(/rev-(\d+)/)[1])));};
 let props=panelProps({fetcher,onReport:(_scope,report)=>reports.push(report)});
 h.render(props);h.flush();await tick();let tree=h.render(props);
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-2');
 assert.match(elements(tree).find(n=>n.type?.name==='ReviewReportContent').props.revisionExport,/rev-2\/export$/);
 elements(tree).find(n=>n.type==='select').props.onChange({target:{value:'rev-1'}});h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-1');
 current=3;props={...props,taskVersion:3};h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-1');assert.match(JSON.stringify(tree),/historical report/);
 elements(tree).find(n=>n.type==='button'&&n.props.children==='View current report').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-3');assert.ok(calls.every(c=>c.init.method===undefined));h.dispose();
});
test('unsupported history falls back to clearly labelled legacy evidence, failed refresh retains ready data',async()=>{
 const h=reportHarness(),reports=[];let fail=false;
 const fetcher=async(url)=>url.includes('?limit=20')?Response.json({}, {status:fail?503:404}):Response.json(fixture());
 const props=panelProps({fetcher,onReport:(_scope,report)=>reports.push(report)});
 h.render(props);h.flush();await tick();let tree=h.render(props);const ready=reports[0];
 assert.match(JSON.stringify(tree),/Legacy task evidence/);fail=true;
 elements(tree).find(n=>n.type==='button').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.length,1);assert.equal(elements(tree).find(n=>n.type?.name==='ReviewReportContent').props.report,ready);assert.match(JSON.stringify(tree),/history could not be loaded/);h.dispose();
});
test('older history pages remain selectable and invalid refresh preserves the exact revision',async()=>{
 const h=reportHarness(),reports=[];let invalid=false;
 const fetcher=async(url)=>{
   if(url.includes('before=')) return Response.json({schemaVersion:1,currentRevisionId:'rev-2',revisions:[rev(1)],nextCursor:null});
   if(url.includes('?limit=20')) return Response.json(invalid?{schemaVersion:2}:{schemaVersion:1,currentRevisionId:'rev-2',revisions:[rev(2)],nextCursor:'rev-2'});
   return Response.json(detail(Number(url.match(/rev-(\d+)/)[1])));
 };
 const props=panelProps({fetcher,onReport:(_scope,report)=>reports.push(report)});h.render(props);h.flush();await tick();let tree=h.render(props);
 elements(tree).find(n=>n.type==='button'&&n.props.children==='Load older revisions').props.onClick();await tick();tree=h.render(props);
 assert.equal(elements(tree).filter(n=>n.type==='option').length,2);
 elements(tree).find(n=>n.type==='select').props.onChange({target:{value:'rev-1'}});h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-1');const ready=reports.at(-1);invalid=true;
 elements(tree).find(n=>n.type==='button').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(reports.at(-1),ready);assert.match(JSON.stringify(tree),/unsupported/);h.dispose();
});
test('a new 21st revision exposes pagination after an exhausted 20-revision history',async()=>{
 const h=reportHarness();let count=20;
 const fetcher=async(url)=>url.includes('?limit=20')?Response.json({schemaVersion:1,currentRevisionId:`rev-${count}`,revisions:Array.from({length:20},(_,i)=>rev(count-i)),nextCursor:count===21?'rev-2':null}):Response.json(detail(count));
 let props=panelProps({fetcher});h.render(props);h.flush();await tick();let tree=h.render(props);
 assert.equal(elements(tree).some(n=>n.type==='button'&&n.props.children==='Load older revisions'),false);
 count=21;props={...props,taskVersion:21};h.render(props);h.flush();await tick();tree=h.render(props);
 assert.equal(elements(tree).some(n=>n.type==='button'&&n.props.children==='Load older revisions'),true);h.dispose();
});
test('duplicate or invalid history identity and dataset source mismatch fail closed',async()=>{
 for(const mutation of ['duplicate','number','execution','plan','kind']){
  const h=reportHarness(),reports=[];const m=manifest(1),d=detail(1);
  if(mutation==='duplicate')m.revisions.push(rev(1));
  if(mutation==='number')m.revisions[0].revisionNumber=0;
  if(mutation==='execution')d.dataset.runId='foreign-execution';
  if(mutation==='plan')d.dataset.planVersion=99;
  if(mutation==='kind')d.dataset.sourceKind='proposed';
  const props=panelProps({fetcher:async url=>Response.json(url.includes('?limit=20')?m:d),onReport:(_scope,report)=>reports.push(report)});
  h.render(props);h.flush();await tick();const tree=h.render(props);
  assert.equal(elements(tree).some(n=>n.type?.name==='ReviewReportContent'),false,mutation);assert.deepEqual(reports,[null]);h.dispose();
 }
});
test('task settlement refreshes a pending report while keeping a historical selection',async()=>{
 const h=reportHarness(),reports=[];let phase='ready';
 const fetcher=async(url)=>{
  if(url.includes('?limit=20')) return Response.json({...manifest(phase==='complete'?3:2),historyState:phase==='pending'?'pending':'ready'});
  return Response.json(detail(Number(url.match(/rev-(\d+)/)[1])));
 };
 let props=panelProps({fetcher,taskVersion:1,taskStatus:'completed',onReport:(_scope,report)=>reports.push(report)});
 h.render(props);h.flush();await tick();let tree=h.render(props);
 elements(tree).find(n=>n.type==='select').props.onChange({target:{value:'rev-1'}});h.render(props);h.flush();await tick();tree=h.render(props);
 phase='pending';props={...props,taskVersion:2,taskStatus:'running'};h.render(props);h.flush();await tick();tree=h.render(props);h.flush();
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-1');assert.match(JSON.stringify(tree),/being saved/);
 phase='complete';props={...props,taskStatus:'completed'};h.render(props);h.flush();await tick();tree=h.render(props);h.flush();
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-1');assert.match(JSON.stringify(tree),/historical report/);
 elements(tree).find(n=>n.type==='button'&&n.props.children==='View current report').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);h.flush();
 assert.equal(reports.at(-1).savedRevision.revisionId,'rev-3');h.dispose();
});
test('pending publication retries are bounded and cleanup cancels its timer',async()=>{
 const scheduled=new Map();let seq=0, requests=0;
 const timers={setTimeout(fn){const id=++seq;scheduled.set(id,fn);return id;},clearTimeout(id){scheduled.delete(id);}};
 const h=reportHarness(timers);const props=panelProps({fetcher:async url=>{requests++;return Response.json(url.includes('?limit=20')?{...manifest(1),historyState:'pending'}:detail(1));}});
 h.render(props);h.flush();await tick();let tree=h.render(props);h.flush();
 for(let i=0;i<20;i++){assert.equal(scheduled.size,1);const [id,fn]=scheduled.entries().next().value;scheduled.delete(id);fn();h.render(props);h.flush();await tick();tree=h.render(props);h.flush();}
 assert.equal(scheduled.size,0);assert.equal(requests,42);assert.match(JSON.stringify(tree),/Automatic checks have stopped/);
 elements(tree).find(n=>n.type==='button').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);h.flush();assert.equal(requests,44);assert.equal(scheduled.size,0);h.dispose();
 const second=reportHarness(timers);second.render(props);second.flush();await tick();second.render(props);second.flush();assert.equal(scheduled.size,1);second.dispose();assert.equal(scheduled.size,0);
});
test('selected drawing identity mismatch is disclosed without changing the viewed report',async()=>{
 const h=reportHarness(),reports=[];let props=panelProps({currentPlan:{planId:'plan',version:1,fingerprint:'fp-1'},fetcher:async url=>Response.json(url.includes('?limit=20')?manifest(1):detail(1)),onReport:(_scope,report)=>reports.push(report)});
 h.render(props);h.flush();await tick();let tree=h.render(props);
 assert.doesNotMatch(JSON.stringify(tree),/different drawing or version/);
 props={...props,currentPlan:{planId:'another-plan',version:1,fingerprint:'another-fingerprint'}};tree=h.render(props);h.flush();
 assert.match(JSON.stringify(tree),/different drawing or version/);assert.equal(reports.length,1);assert.equal(reports[0].savedRevision.revisionId,'rev-1');
 props={...props,currentPlan:{planId:'plan',version:1,fingerprint:'fp-1'}};tree=h.render(props);assert.doesNotMatch(JSON.stringify(tree),/different drawing or version/);h.dispose();
});
test('pending and unavailable saves disclose the last saved report for current and historical views',async()=>{
 for(const viewing of ['current','historical']) for(const status of ['pending','unavailable']){
  const h=reportHarness(),reports=[];let historyState='ready';
  const props=panelProps({fetcher:async url=>Response.json(url.includes('?limit=20')?{...manifest(2),historyState}:detail(Number(url.match(/rev-(\d+)/)[1]))),onReport:(_scope,report)=>reports.push(report)});
  h.render(props);h.flush();await tick();let tree=h.render(props);
  if(viewing==='historical'){elements(tree).find(n=>n.type==='select').props.onChange({target:{value:'rev-1'}});h.render(props);h.flush();await tick();tree=h.render(props);}
  historyState=status;elements(tree).find(n=>n.type==='button').props.onClick();h.render(props);h.flush();await tick();tree=h.render(props);h.flush();
  assert.equal(reports.at(-1).savedRevision.revisionId,viewing==='historical'?'rev-1':'rev-2');
  assert.match(JSON.stringify(tree),status==='pending'?/new report is being saved/i:/latest report could not be saved/i);
  assert.match(JSON.stringify(tree),/last saved report remains available/i);h.dispose();
 }
});
test('scope changes abort obsolete history responses',async()=>{
 const h=reportHarness(),requests=[],callbacks=[];const fetcher=(url,init)=>new Promise(resolve=>requests.push({url,init,resolve}));
 let props=panelProps({fetcher,onReport:(scope,report)=>callbacks.push({scope,report})});h.render(props);h.flush();
 props={...props,scope:{...reportScope,key:'task-b',epoch:2,taskId:'task-b'},taskId:'task-b'};h.render(props);h.flush();
 assert.equal(requests[0].init.signal.aborted,true);requests[0].resolve(Response.json(manifest(1)));await tick();assert.equal(callbacks.length,0);
 requests[1].resolve(Response.json(manifest(1)));await tick();requests[2].resolve(Response.json(detail(1)));await tick();assert.equal(callbacks[0].scope.epoch,2);h.dispose();
});

test('report denied, unavailable, empty, malformed and oversized responses expose recovery without a parsed callback',async()=>{
  for(const response of [()=>Response.json({}, {status:403}),()=>Response.json({}, {status:404}),()=>new Response(''),()=>new Response('not-json'),()=>new Response('x',{headers:{'content-length':String(MAX_REPORT_BYTES+1)}})]){
    const h=reportHarness(),callbacks=[],props=panelProps({fetcher:async()=>response(),onReport:(_scope,report)=>callbacks.push(report)});
    h.render(props);h.flush();await tick();const tree=h.render(props);
    assert.equal(elements(tree).some(node=>node.type?.name==='ReviewReportContent'),false);
    assert.equal(elements(tree).some(node=>node.type==='button'),true,'Failure offers explicit retry');
    assert.deepEqual(callbacks,[null]);h.dispose();
  }
});

test('ready report preview is bounded to 200 rows while retained CSV includes all validated rows',()=>{
  const data=fixture();data.boqRows=Array.from({length:1200},(_,index)=>({category:`Category ${index}`,count:index}));
  const report=parseReviewReport(data),h=reportHarness(),tree=h.renderContent(report);
  assert.equal(elements(tree).filter(node=>node.type==='tbody')[0].props.children.length,200);
  assert.match(reportTableCsv(report),/Category 1199/);
  assert.equal(report.boq.rows.length,1200);
});

test('report keeps limitations visible and places source metadata in a disclosure after the table',()=>{
  const h=reportHarness(),tree=h.renderContent(parseReviewReport(fixture())),all=elements(tree);
  const source=all.find(node=>node.type==='details'&&React.Children.toArray(node.props.children)[0]?.props.children==='Source details');
  assert.ok(source);assert.ok(all.indexOf(source)>all.findIndex(node=>node.type==='table'));
  const sourceText=elements(source).flatMap(node=>React.Children.toArray(node.props.children).filter(child=>typeof child==='string')).join(' ');
  assert.match(sourceText,/synthetic-document/);assert.match(sourceText,/partial/);assert.match(sourceText,/Source model revision/);
  const visibleText=all.filter(node=>!elements(source).includes(node)).flatMap(node=>React.Children.toArray(node.props.children).filter(child=>typeof child==='string')).join(' ');
  assert.match(visibleText,/Only retained contiguous evidence pages/);assert.match(visibleText,/Read only/);
});
