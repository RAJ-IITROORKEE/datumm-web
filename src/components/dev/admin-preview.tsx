'use client';

import {useMemo,useState,type ReactNode} from 'react';
import {AdminShell} from '../admin/admin-shell';
import {AgentSection,WebSearchSection,McpSection} from '../admin/config-sections';
import {SkillsRoute} from '../admin/skills-section';
import {TracesSection} from '../admin/traces-section';
import {HistorySection} from '../admin/history-section';
import {ModelsSection} from '../admin/models-section';
import {ToolsSection} from '../admin/tools-section';
import {OverviewSection,KnowledgeSection,PluginSection,AuditSection} from '../admin/data-sections';
import {AdminClientProvider,type AdminClient,type ConfigEnvelope,type Result} from '../admin/use-admin';
import {DesktopSettings} from '../desktop-settings';
import {fixtureTraces} from './feedback-traces-preview';
import {createHistoryFixture} from './admin-history-fixture';
import {createModelsFixture} from './admin-models-fixture';
import {emptyConfig,type AdminSkill,type Mode} from '@/lib/admin-config.mjs';
import release from '../../../public/downloads/release.json';
import '../../app/admin/admin.css';

type Scenario='ready'|'empty'|'missing'|'forbidden'|'conflict'|'save-error'|'traces-off'|'history-off'|'models-off'|'models-none'|'tavily-off'|'tavily-on'|'tools-off'|'skills-on';
const entry=(id:string,label:string,group:string,risk:string,allowed:string[],extra:Record<string,unknown>={})=>({id,label,description:'Synthetic description for '+label.toLowerCase()+'. Fixture data only.',group,runsOn:'DATUMM service',risk,required:false,allowedModes:allowed,defaultModes:allowed,toolNames:[id],...extra});
const TOOL_CATALOG=[
 entry('core','Core tools','Core','read',['ask','plan','build'],{required:true,locked:false}),
 entry('knowledge_search','Knowledge search','Research','read',['ask','plan']),
 entry('web_search','Web search','Research','read',['ask','plan']),
 entry('search_regulations','Regulation search','Research','read',['ask','plan']),
 entry('revit_read','Revit reads','Revit','read',['ask','plan','build'],{runsOn:'Your Revit connector'}),
 entry('revit_write','Revit changes','Revit','device',['build'],{runsOn:'Your Revit connector',locked:true}),
 entry('generate_concept_image','Concept images','Design','external',['ask','plan'],{runsOn:'Image model provider'}),
 entry('create_design','Create design','Design','read',['plan']),
 entry('propose_changes','Propose changes','Design','read',['plan','build']),
];
const FIXTURE_SKILLS:AdminSkill[]=[
 {id:'fixture-skill',name:'Fixture skill',description:'Use when a prompt mentions fixtures. Synthetic skill.',instructions:'Synthetic instructions, revision 12.',modes:['ask'],enabled:true},
 {id:'nbc-egress',name:'NBC egress',description:'Use when checking exits, stairs or travel distance.',instructions:'Synthetic guidance. Cite the code clause.',modes:['ask','plan'],enabled:true},
 {id:'no-trigger',name:'No trigger line',description:'Plain description.',instructions:'Synthetic guidance.',modes:['plan','build'],enabled:false},
];
// Stand-in for POST admin/skills/preview: shared words rank skills; one clear match attaches.
function previewSkills(body:{prompt:string;mode:string;skills:typeof FIXTURE_SKILLS}){
 const words=new Set(body.prompt.toLowerCase().match(/[a-z0-9]{3,}/g)??[]);
 const scored=body.skills.filter(skill=>skill.enabled&&skill.modes.includes(body.mode as Mode)).map(skill=>({id:skill.id,score:(`${skill.id.replace(/-/g,' ')} ${skill.description}`.toLowerCase().match(/[a-z0-9]{3,}/g)??[]).filter(word=>words.has(word)).length}));
 const hits=scored.filter(item=>item.score).sort((a,b)=>b.score-a.score);
 return {listed:(hits.length?hits:scored).slice(0,8).map(item=>item.id),attached:hits.length&&hits[0].score>=2&&hits[0].score>(hits[1]?.score??0)?hits[0].id:null};
}
function fixtureClient(scenario:Scenario):AdminClient {
  // Traces, history and models are on in every state except their own '-off' state.
  const capabilities={version:1,features:{adminTraces:scenario!=='traces-off',adminHistory:scenario!=='history-off',adminModels:scenario!=='models-off',adminTools:scenario!=='tools-off',approvalModes:scenario!=='tools-off',...(scenario==='skills-on'?{skillsOnDemand:true}:{}),...(scenario==='tavily-off'||scenario==='tavily-on'?{tavilySearch:scenario==='tavily-on'}:{})}};
  let envelope:ConfigEnvelope&{capabilities?:unknown}={capabilities,toolCatalog:scenario==='tools-off'?undefined:TOOL_CATALOG,config:{...emptyConfig(),models:['openai/gpt-6.1-sol','openai/gpt-6-luna','google/gemini-3-pro'],defaultModel:'openai/gpt-6-luna',...(scenario==='skills-on'?{skills:FIXTURE_SKILLS}:{})},effective:{models:['openai/gpt-6.1-sol','openai/gpt-6-luna'],defaultModel:'openai/gpt-6-luna',defaultReasoningEffort:'high'},revision:12,updatedBy:'preview@example.invalid'};
  let sources=scenario==='empty'?[]:[{id:'fixture-revit',url:'https://example.invalid/revit-room-guide',title:'Revit room review guide',corpus:'revit',status:'ready',chunks:24,updatedAt:'2026-11-12T06:00:00Z'},{id:'fixture-failed',url:'https://example.invalid/unavailable-source',title:'Unavailable public source',corpus:'other',status:'failed',chunks:0,updatedAt:'2026-11-12T05:00:00Z',error:'Synthetic indexing error. No external page was fetched.'}];
  const history=createHistoryFixture(envelope.config,Number(envelope.revision),'preview@example.invalid');
  let nextSource=0,approvalMode='ask';
  const models=createModelsFixture(()=>({models:envelope.config.models,defaultModel:envelope.config.defaultModel}),{none:scenario==='models-none'});
  return async function<T>(path:string,init?:{method?:string;body?:unknown}):Promise<Result<T>> {
    await new Promise(resolve=>setTimeout(resolve,300));
    if(scenario==='missing'||scenario==='forbidden')return {ok:false,reason:scenario,message:'Synthetic unavailable state.'};
    const method=init?.method??'GET';
    if(method!=='GET'&&scenario==='save-error')return {ok:false,reason:'error',message:'Synthetic save failure. Your edits have been preserved.'};
    let data:unknown;
    if(path==='admin/config'){
      if(method==='PUT'){
        const body=init?.body as {config:ConfigEnvelope['config'];expectedRevision:ConfigEnvelope['revision']};
        if(scenario==='conflict'||body.expectedRevision!==envelope.revision)return {ok:false,reason:'stale',message:'Synthetic conflicting revision.'};
        envelope={...envelope,config:structuredClone(body.config),revision:Number(envelope.revision)+1};
        history.record(envelope.config,'update',null,'');
      }
      data=envelope;
    }else if(path==='admin/config/restore'){
      const body=init?.body as {fromRevision:number;expectedRevision:number;note?:string};
      if(scenario==='conflict')return {ok:false,reason:'stale',message:'Synthetic conflicting revision.'};
      const restored=history.restore(body.fromRevision,body.expectedRevision,body.note??'');
      if(!restored.ok)return restored;
      envelope={...envelope,config:restored.data,revision:history.current()};
      data=envelope;
    }else if(path.startsWith('admin/config/history')){
      const url=new URL(path,'https://fixture.invalid/'),id=url.pathname.split('/')[4];
      const found=id?history.detail(Number(id)):null;
      if(id&&!found)return {ok:false,reason:'missing',message:'Unknown revision.'};
      data=found??history.list(Number(url.searchParams.get('before'))||null,Number(url.searchParams.get('limit'))||20);
    }else if(path==='config')data={capabilities};
    else if(path==='admin/skills/preview')data=previewSkills(init?.body as Parameters<typeof previewSkills>[0]);
    else if(path==='me/permissions'){
      if(method==='PUT')approvalMode=(init?.body as {approvalMode:string}).approvalMode;
      data={approvalMode};
    }else if(path==='admin/overview')data={health:'healthy',imageVersion:'synthetic-preview',counts:{tasks:23,owners:4,activeRuns:2,runsToday:3},usdToday:0.42};
    else if(path.startsWith('admin/audit'))data=scenario==='empty'?[]:history.audit(new URL(path,'https://fixture.invalid/').searchParams);
    else if(path==='admin/models')data=models.list();
    else if(path==='admin/models/test'){const tested=models.test((init?.body as {modelId:string}).modelId);if(!tested.ok)return tested;data=tested.data;}
    else if(path.startsWith('admin/models/usage'))data=models.usage(new URL(path,'https://fixture.invalid/').searchParams);
    else if(path.startsWith('admin/models/')&&path.split('?')[0].endsWith('/tests')){const [,,provider,name]=path.split('/');data=models.tests(provider+'/'+name,10);}
    else if(path.startsWith('admin/traces'))data=fixtureTraces(new URL(path,'https://fixture.invalid/').searchParams,{});
    else if(path==='admin/knowledge/sources'){
      if(method==='POST'){const body=init?.body as {url:string;title?:string;corpus:string};history.addKnowledge(body.title||body.url);sources.push({id:'fixture-added-'+(++nextSource),url:body.url,title:body.title||body.url,corpus:body.corpus,status:'ready',chunks:8,updatedAt:new Date().toISOString()});}
      data=sources;
    }else if(path.startsWith('admin/knowledge/sources/')){
      const id=path.split('/')[3];
      if(method==='DELETE')sources=sources.filter(source=>source.id!==id);
      if(path.endsWith('/reindex'))sources=sources.map(source=>source.id===id?{...source,status:'ready',chunks:8,error:undefined}:source);
      data=null;
    }else return {ok:false,reason:'missing',message:'This fixture does not provide that resource.'};
    return {ok:true,data:structuredClone(data) as T};
  };
}

function PreviewFrame({children,onClose,tools}:{children:ReactNode;onClose:()=>void;tools?:ReactNode}) {
  return <section style={{position:'fixed',inset:0,zIndex:200,display:'flex',flexDirection:'column',background:'var(--background)'}}><header style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',padding:'10px 16px',borderBottom:'1px solid var(--border)',fontSize:12}}><strong>Synthetic design preview</strong><span style={{color:'var(--muted-foreground)'}}>In-memory data only · no account, agent or Revit changes</span>{tools}<button onClick={onClose} style={{marginLeft:'auto',border:'1px solid var(--border)',borderRadius:5,padding:'5px 10px'}}>Exit preview</button></header><div style={{flex:1,minHeight:0,position:'relative'}}>{children}</div></section>;
}
export function AdminPreview({onClose}:{onClose:()=>void}) {
  const [path,setPath]=useState('/admin'),[scenario,setScenario]=useState<Scenario>('ready');
  const client=useMemo(()=>fixtureClient(scenario),[scenario]);
  return <PreviewFrame onClose={onClose} tools={<label>Fixture state <select aria-label="Admin fixture state" value={scenario} onChange={event=>setScenario(event.target.value as Scenario)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:5,padding:5,marginLeft:7}}><option value="ready">Ready</option><option value="empty">Empty lists</option><option value="missing">API unavailable</option><option value="forbidden">Access denied</option><option value="conflict">Save conflict</option><option value="save-error">Save failure</option><option value="traces-off">Traces not provided</option><option value="history-off">History not provided</option><option value="models-off">Models not provided</option><option value="models-none">No models served</option><option value="tavily-off">Tavily key absent</option><option value="tavily-on">Tavily key present</option><option value="tools-off">Tools and approvals not provided</option><option value="skills-on">Skills registry on</option></select> <button onClick={()=>setPath('/admin/traces')} style={{border:'1px solid var(--border)',borderRadius:5,padding:'5px 10px'}}>Open Traces path</button> <button onClick={()=>setPath('/admin/history')} style={{border:'1px solid var(--border)',borderRadius:5,padding:'5px 10px'}}>Open History path</button> <button onClick={()=>setPath('/admin/models')} style={{border:'1px solid var(--border)',borderRadius:5,padding:'5px 10px'}}>Open Models path</button> <button onClick={()=>setPath('/admin/tools')} style={{border:'1px solid var(--border)',borderRadius:5,padding:'5px 10px'}}>Open Tools path</button></label>}><div className="admin-root" style={{position:'absolute'}}><AdminClientProvider key={scenario} client={client}><AdminShell email="preview@example.invalid" activePath={path} onNavigate={setPath}><div key={path}>{path==='/admin'?<OverviewSection/>:path==='/admin/agent'?<AgentSection/>:path==='/admin/web-search'?<WebSearchSection/>:path==='/admin/knowledge'?<KnowledgeSection/>:path==='/admin/skills'?<SkillsRoute/>:path==='/admin/mcp'?<McpSection/>:path==='/admin/plugin'?<PluginSection release={release}/>:path==='/admin/traces'?<TracesSection/>:path==='/admin/history'?<HistorySection/>:path==='/admin/models'?<ModelsSection/>:path==='/admin/tools'?<ToolsSection/>:<AuditSection/>}</div></AdminShell></AdminClientProvider></div></PreviewFrame>;
}
export function SettingsPreview({onClose}:{onClose:()=>void}) {
  const [approvals,setApprovals]=useState(true),client=useMemo(()=>fixtureClient('ready'),[]);
  return <PreviewFrame onClose={onClose} tools={<label><input type="checkbox" checked={approvals} onChange={event=>setApprovals(event.target.checked)}/> Backend reports approvalModes</label>}><AdminClientProvider client={client}><DesktopSettings approvalModes={approvals} open onOpenChange={open=>{if(!open)onClose();}} models={['openai/gpt-6.1-sol','openai/gpt-6-luna','example-provider/'+('long-model-identity-'.repeat(9)),'catalog-without-provider']} generalContent={<div className="settings-general" aria-label="General preferences"><div className="setting-row"><div><strong>Unsent drafts</strong><small>Fixture text. Your actual preferences are available in the main workspace.</small></div></div></div>} revitContent={<div className="provider-section"><h2>Revit not connected</h2><p>Synthetic preview. Use the main workspace to connect a real model.</p></div>}/></AdminClientProvider></PreviewFrame>;
}
