import {isRenderablePlan,reviewFocus} from '@/lib/workspace-layout.mjs';
import {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {type AuthStatus, type ProviderStatus} from '@/lib/desktop-contract';
import {accountAdmissionState} from '../account-admission';
import {type ReasoningEffort} from '../model-picker';
import {workflowState} from '@/lib/workflow-state';
import {type DesignPlacementDraft, type DesignRecord, candidateDrawing} from '../design-review';
import {emptyProjection, reduceProjection, type TaskEvent} from '@/lib/task-projection';
import {type OpenCodeQuestion} from '../opencode-questions';
import {activityTurns, latestTaskActivity, type RunManifest} from '../agent-activity';
import {type SavedTurn} from '../saved-turn-result';
import {type ComposerSource} from '../composer-media';
import {applyAppearance, parseAppearance, defaultAppearance} from '@/lib/appearance';
import {replaceTerminalCommand} from '@/lib/task-command';
import {settingsSidebarTransition} from '@/lib/settings-navigation.mjs';
import {savedTaskConnectionNotice, chatStartFailure} from '@/lib/chat-start';
import {planBuildStep} from '@/lib/plan-build-flow';
import {FileJson, LayoutTemplate, FileSpreadsheet, Download} from 'lucide-react';
import {DefaultChatTransport} from 'ai';
import {useChat} from '@ai-sdk/react';
import {settledPoll,openChatPollMs,listPollMs} from '@/lib/settled-poll.mjs';
import {advanceSeen,isUnread} from '@/lib/chat-seen.mjs';
import {type ReplyPayload, type AgentQuestion} from '../agent-questions';
import {hasPromptContent, splitViewportPrompt, appendViewportPrompt} from '../prompt-content';
import {type StickToBottomContext} from 'use-stick-to-bottom';
import {type DrawingVersion} from '../plan-canvas';
import {type PlanningGoal} from '../planning-goal';
import {type ModelCoverage, type AdviceFinding, type RegulationResearch} from '../evidence-results';
import {type BuildComparison, type BuildFeedback} from '../build-comparison';
import {type SchedulerView} from '../agent-scheduler';
import {type SpecialistResult} from '../agent-specialists';
import {type ContextUsageData, type TaskMemory, type ContextMetrics} from '../agent-memory';
import {type DraftAssessment, type NativeBatch} from '../draft-assessment';

export type Mode='ask'|'plan'|'build';

type RuntimeConfig={models:string[];defaultModel?:string;defaultReasoningEffort?:ReasoningEffort;agentEnabled?:boolean;runtime?:string;fixturePrompt?:string;supportedExports?:string[];nativeAvailable?:boolean;nativeReadAvailable?:boolean;authenticationRequired?:boolean};

type McpTool={name:string;description?:string;inputSchema?:{properties?:Record<string,{type?:string;description?:string;default?:unknown;enum?:unknown[];items?:{type?:string}}>;required?:string[]}};

type Device={id:string;name:string;online:boolean;fullControl:boolean;controlExpiresAt?:string|null;agentControl?:{binding:VariableBinding;expiresAt:string;remaining:number}|null};

type VariableBinding={briefId:string;planId:string;version:number;fingerprint:string;selectionRevision:number};

type VariableVersion=DrawingVersion;

export type RunEvent=TaskEvent;

export type DraftTask={fingerprint:string;requestedGoal?:string;previewSvg?:string|null;moveSemantics?:string;moveAnchors?:Record<string,{fromPoint:{x:number;y:number};toPoint:{x:number;y:number}}>;deletions?:{key:string;targetId:string;elements:{id:string;kind:string;name:string}[]}[];changes:{title:string;operations:({key:string;kind:string}&Record<string,unknown>)[]};successCriteria:string[]};

type AccessReview={runId:string;fingerprint:string;commits:number;scope:{documentId:string;levelId:string;operationKinds:string[];typeIds:string[];maxOperations:number;maxElements:number;maxTotalOperations?:number;maxTotalElements?:number;boundsMm:Record<'x'|'y',number[]>|null}};

type PlacementContext={schemaVersion:2;sessionId:string;documentId:string;revision:number;title:string;levels:{id:string;name:string;elevationMm:number}[];plans:{id:string;name:string;levelId:string}[]};

type NativePlacement={schemaVersion:2;sessionId:string;documentId:string;revision:number;levelId:string;viewId:string;originXmm:number;originYmm:number;rotationDegrees:number};

export type PlanBinding={briefId:string;planId:string;version:number;fingerprint:string};

export type ConceptImage={model:string;provenance:string;planBinding?:PlanBinding};

export type InterpretedBrief={status:string;dimensions:{sourceText:string;role:string;widthMm:string|null;depthMm:string|null}[];values:Record<string,{value:string|number;provenance:string}>;unresolved:string[];assumptions:string[];program:{livingHall:boolean|null;kitchen:boolean|null};policy:{modelId:string;selection:string}|null};

export type Run={projectId?:string;acceptance?:{plan:{planId:string;version:number;fingerprint:string};acceptedAssumptions:string[]}|null;id:string;taskVersion?:number;eventCursor?:number;executionId?:string;currentPlanRef?:{schemaVersion:2;source:'variable'|'legacy_plan'|'legacy_draft';briefId:string;planId:string;version:number;fingerprint:string}|null;conversation?:{prompt?:string;answer?:string;attachmentIds?:string[];nativeMessages?:{id:string;text:string;finish:string|null}[]}[];title:string;mode:Mode;model:string;reasoningEffort?:ReasoningEffort;status:string;modelOutcome?:{state:'no_write'|'pending'|'unknown'|'committed_unverified'|'committed_verified'|'rolled_back'|'failed';verified:boolean;present:number|null;missing:number|null;warnings:number|null;deleted?:number|null;verifiedBatches?:number;expectedBatches?:number;completedBuild?:boolean};device_id:string;pinned_at?:string;archived_at?:string;events:RunEvent[];data:{native_messages?:{id:string;text:string;finish:string|null}[];planning_goal?:PlanningGoal;designConversationIndex?:number;nativeBuildConversationIndex?:number;organized_done?:boolean;run_manifest?:RunManifest;project_context_shared?:boolean;agent_coverage?:ModelCoverage;agent_advice?:AdviceFinding[];agent_research?:RegulationResearch[];build_comparison?:BuildComparison;build_feedback?:BuildFeedback[];build_revision_count?:number;m09_revision?:{goalVersion:number};build_comparison_error?:string;annotation_view_review?:{viewId:string;name:string;reason:string};native_batches?:{verified:boolean;compiled:{counts:Record<string,number>};receipt:{state:string;elementIds:string[]}}[];build_type_review?:{requiredSizes:Record<string,unknown>[];loadedChoices:Record<string,unknown>[];resolution:string;revision:number};agent_scheduler?:SchedulerView|null;agent_specialists?:SpecialistResult[];agent_interpreted_brief?:InterpretedBrief;usage?:ContextUsageData;model_context_requirement?:'none'|'read'|'write';failure?:{schemaVersion:1;code:string;recoveryAction:string};agent_memory?:TaskMemory;agent_context?:ContextMetrics;agent_limit?:{reason:string;continuationAvailable:boolean};agent_quantity_pages?:{documentId:string;revision:number;scope:string;categories:string[];coverage:string;groups:unknown[]}[];agent_native_image?:{documentId:string;revision:number;viewName:string;width:number;height:number;provenance:string};agent_element_pages?:{scope:{categories:string[]};coverage:{status:string;returnedCount:number;totalCount:number};aggregates:{inspectedStraightWallProjectedLengthM:number};limitations:string[]}[];task_access?:{revoked:boolean;remaining:number;expiresAt:string};agent_execution?:boolean;agent_draft?:DraftTask;draft_task?:DraftTask;agent_question?:AgentQuestion;agent_reply_receipt?:{questionId:string;version:number};agent_task_plan?:{version:number;goal:string;successCriteria:string[];steps:{key:string;title:string;action:string;expectedResult:string;targetCategories?:string[]}[];progress:{key:string;status:string}[]};variable_selection?:{version:number};operation_id?:string;recovery?:{data?:{state?:string;sameDocument?:boolean;elements?:{missing?:boolean}[]|null}};concept?:ConceptImage;concept_error?:string;plan?:{version:number;fingerprint:string;brief:{bedrooms:number;bathrooms:number;entrance:string;site_width_mm:number;site_depth_mm:number;wall_height_mm:number}};agent_design?:{briefId:string;brief:{site:{widthMm:number;depthMm:number;entry:string};requirements:{key:string;kind:string}[]};candidates:{planId:string;version:number;fingerprint:string;score:number}[];assumptions:string[];diagnostics:string[];previewSvg:string;previewRooms:{name:string;expectedAreaM2:number}[];conceptImage?:ConceptImage};agent_inspection?:{documentId:string;revision:number;counts:Record<string,number>;rooms:{name:string;areaM2:number}[];coverage:{category:string;status:string;returnedCount:number;totalCount:number|null}[];limitations:string[]};agent_postbuild_inventory?:{documentId:string;revision:number;counts:Record<string,number>};agent_result?:{status:string;answer?:string;question?:string;goal?:string;documentId?:string;operationId?:string;verification?:string;criteria?:string[];assessment?:DraftAssessment;batchHistory?:NativeBatch[];changes?:Record<string,number>};selected_plan?:{version:number};snapshot?:{svg:string;revision:number;provenance:string};inventory?:{counts:Record<string,number>;rooms:{name:string;areaM2:number}[]};answer?:string;error?:string;context?:{title:string;activeViewName:string;documentId:string};compiled?:{svg?:string;changes?:{levelId:string;units:string;coordinateFrame:string;operations:({key:string;kind:string}&Record<string,unknown>)[]};counts:Record<string,number>;areas:{name:string;expectedAreaM2:number}[]};proposal?:{proposalId:string;expiresAt:string;documentId:string;approvalHash:string;revision:number;deletions?:{key:string;targetId:string;elements:{id:string;kind:string;name:string}[]}[]};receipt?:{state:string};verification?:{receipt?:{elementIds?:string[];warnings?:string[]};elements?:unknown[]}}};

export function taskStepCompleted(run:Run,step:NonNullable<Run['data']['agent_task_plan']>['steps'][number]):boolean{
 return run.data.agent_task_plan?.progress.some(row=>row.key===step.key&&row.status==='completed')??false;
}

export const terminal=new Set(['completed','needs_input','failed','cancelled','awaiting_approval','interrupted','paused_limit','paused_recovery','reconciling']);

export const completedDraftTitle=(title:string)=>title.replace(/^Dry-run:\s*/i,'').replace(/\s*[—–-]\s*Plan only\s*$/i,'');

export const reviewCriteria=(criteria:string[])=>criteria.filter(item=>!(/\bPlan(?: and preview)? only\b|\bno native transaction\b|\bno model change is authorized\b/i.test(item)));

export type ProjectRow={id:string;title:string;chatCount?:number;revision?:number;isDefault?:boolean;archived_at?:string};
/** The hosted backend may not have a route yet: the feature hides instead of showing an error. */
export const notSupported=(failure:unknown)=>[404,405].includes((failure as {status?:number})?.status??0);
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{

 const response=await fetch('/api/service/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});

 const raw=await response.text();let data:unknown;
 try{data=JSON.parse(raw);}catch{data={detail:raw.slice(0,240)||'The request could not be completed.'};}
 if(!response.ok){
  const detail=data&&typeof data==='object'&&'detail' in data?data.detail:null;
   const failure=new Error(typeof detail==='string'?detail:detail&&typeof detail==='object'&&'message' in detail&&typeof detail.message==='string'?detail.message:detail&&typeof detail==='object'&&'error' in detail&&typeof detail.error==='string'?detail.error:'The request could not be completed.');
  Object.assign(failure,{status:response.status,path});throw failure;
 }
 return data as T;

}

export function useWorkspaceState({authConfigured,desktopPreview=false}:{authConfigured:boolean;desktopPreview?:boolean}){

 const [desktopAvailable,setDesktopAvailable]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
 const [accountStatus,setAccountStatus]=useState<AuthStatus>(),[accountStatusError,setAccountStatusError]=useState(''),[accountActionError,setAccountActionError]=useState(''),[accountBusy,setAccountBusy]=useState(false),[accountWorkspaceSubject,setAccountWorkspaceSubject]=useState<string>();
 const accountEpoch=useRef(0);
 const [sendShortcut,setSendShortcut]=useState('enter'),[canvasInputEnabled,setCanvasInputEnabled]=useState(true),[persistentProperties,setPersistentProperties]=useState(true);
 useEffect(()=>{try{setSendShortcut(localStorage.getItem('datumm-send-shortcut')==='ctrl-enter'?'ctrl-enter':'enter');setCanvasInputEnabled(localStorage.getItem('datumm-canvas-input')!=='false');setPersistentProperties(localStorage.getItem('datumm-persistent-properties')!=='false');}catch{}},[]);
 const [providerStatus,setProviderStatus]=useState<ProviderStatus>();
 useEffect(()=>{void window.desktop?.providerStatus().then(setProviderStatus).catch(()=>{});},[]);
 useEffect(()=>{setDesktopAvailable(Boolean(window.desktop));},[]);
 useEffect(()=>{
  if(desktopPreview||!window.desktop)return;
  let active=true;
  const refresh=()=>{void window.desktop!.authStatus().then(value=>{if(active){setAccountStatus(value);setAccountStatusError('');}}).catch(()=>{if(active)setAccountStatusError('DATUMM account status could not be checked. Retry the check.');});};
  refresh();const timer=setInterval(refresh,2000);
  return()=>{active=false;clearInterval(timer);};
 },[desktopPreview]);
 const updateAccountStatus=useCallback((value:AuthStatus)=>{setAccountStatus(value);setAccountStatusError('');setAccountActionError('');},[]);
 const accountAction=useCallback(async(action:'status'|'signIn'|'signOut'|'refreshAuth')=>{
  if(!window.desktop||accountBusy)return;
  setAccountBusy(true);setAccountActionError('');
  try{
   const value=action==='status'?await window.desktop.authStatus():action==='signIn'?await window.desktop.signIn():action==='signOut'?await window.desktop.signOut():await window.desktop.refreshAuth();
   updateAccountStatus(value);
   if(action==='refreshAuth'&&value.state==='expired-offline')setAccountActionError('The DATUMM session could not be renewed. Check your connection and retry.');
  }catch{setAccountActionError(action==='signIn'?'DATUMM sign-in could not be started. Check that the system browser is available and retry.':action==='refreshAuth'?'DATUMM could not refresh this account. Check your connection and retry.':'DATUMM account sign-out could not be completed. Retry the action.');}
  finally{setAccountBusy(false);}
 },[accountBusy,updateAccountStatus]);
 const {localTest:testIdentity,admittedSubject,needsAccountAdmission,workspaceLoading:accountWorkspaceLoading}=accountAdmissionState(desktopAvailable,desktopPreview,accountStatus,accountWorkspaceSubject);
 const signedDesktopAccount=desktopAvailable&&!desktopPreview&&accountStatus?.kind==='hosted-auth'&&['signed-in','expired-offline'].includes(accountStatus.state)?accountStatus:undefined;
 const accountExpired=desktopAvailable&&!desktopPreview&&!testIdentity&&accountStatus?.state==='expired-offline';

 const [mode,setMode]=useState<Mode>('plan'),[prompt,setPrompt]=useState(''),[model,setModel]=useState('openai/gpt-6-luna'),[reasoningEffort,setReasoningEffort]=useState<ReasoningEffort>('high');
 const modelPreferenceInitialized=useRef(false);
 const [useCurrentModel,setUseCurrentModel]=useState(false);
 const [buildSetupOpen,setBuildSetupOpen]=useState(false);

 const [models,setModels]=useState<string[]>([]),[devices,setDevices]=useState<Device[]>([]),[deviceId,setDeviceId]=useState('');
  const [workspaceReady,setWorkspaceReady]=useState(false);
  const [runtimeConfig,setRuntimeConfig]=useState<RuntimeConfig|null>(null);
  const [mcpTools,setMcpTools]=useState<McpTool[]>([]);
  const [mcpToolsError,setMcpToolsError]=useState('The hosted workspace does not expose a tool catalog.');

  const offlineFixture=runtimeConfig?.runtime==='offline-fixture';
  const liveRuntime=runtimeConfig?.runtime==='opencode';
  const buildUnavailable=desktopPreview||offlineFixture||runtimeConfig?.nativeAvailable===false;
  const [revitSessions,setRevitSessions]=useState<number|null>(null);
  const [nativeContext,setNativeContext]=useState<{sessionId:string;observedAt:string;context:Record<string,unknown>}|null>(null),[nativeContextError,setNativeContextError]=useState('');

 const [runs,setRuns]=useState<Run[]>([]),[runId,setRunId]=useState('');
 const [projectContextOpen,setProjectContextOpen]=useState(false),[projectsTarget,setProjectsTarget]=useState<HTMLDivElement|null>(null);
 const [projects,setProjects]=useState<ProjectRow[]>([]),[projectsSupported,setProjectsSupported]=useState(false),[chatMenuUnsupported,setChatMenuUnsupported]=useState<string[]>([]),[seen,setSeen]=useState<Record<string,number>>({});
 const [newProject,setNewProject]=useState(''),[collapsedProjects,setCollapsedProjects]=useState<string[]>([]),[projectOrder,setProjectOrder]=useState<string[]>([]);
 const [renameTarget,setRenameTarget]=useState<{kind:'chat'|'project';id:string;title:string;revision:number}|null>(null),[renameTitle,setRenameTitle]=useState('');
 useEffect(()=>{try{for(const [key,set] of [['collapsed-projects',setCollapsedProjects],['project-order',setProjectOrder]] as const){const value=JSON.parse(localStorage.getItem('datumm-'+key)??'[]');if(Array.isArray(value)&&value.length<=100&&value.every(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(id)))set(value);}}catch{}},[]);
 const [commandIndex,setCommandIndex]=useState(0),[commandsDismissed,setCommandsDismissed]=useState(false);
 const commandMatches=['inspect','plan','compare','verify','handoff'].filter(command=>command.startsWith(prompt.slice(1)));
 const commandsOpen=liveRuntime&&!commandsDismissed&&/^\/\w*$/.test(prompt)&&commandMatches.length>0;
 const chooseCommand=(command:string)=>{if(command==='plan')setMode('plan');setPrompt('/'+command+' ');setCommandsDismissed(false);document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();};
 const [workflowFilter,setWorkflowFilter]=useState(''),[notifications,setNotifications]=useState(false);
 const notificationStates=useRef(new Map<string,string>());
 useEffect(()=>{const update=()=>setNotifications(false);update();window.addEventListener('datumm-notifications-changed',update);return()=>window.removeEventListener('datumm-notifications-changed',update);},[]);
 useEffect(()=>{if(!window.desktop)return;for(const item of runs){const state=workflowState(item),old=notificationStates.current.get(item.id);notificationStates.current.set(item.id,state.kind+state.label);if(notifications&&old&&old!==state.kind+state.label&&state.kind!=='in_progress')void window.desktop.notifyTask({taskId:item.id,key:state.kind+':'+state.label+':'+(item.data.run_manifest?.sessionId??'saved'),title:state.label}).catch(()=>{});}},[runs,notifications]);

 const [planningGoalOpen,setPlanningGoalOpen]=useState(false);
 const placementDrafts=useRef(new Map<string,DesignPlacementDraft>());
 const [projection,setProjection]=useState(()=>emptyProjection<Run>());
  const run=projection.snapshot,events=projection.events;
   const nativeQuestions=(run?.data as {opencode_questions?:OpenCodeQuestion[]}|undefined)?.opencode_questions??[];
   const nativeTodos=(run?.data as {opencode_todos?:{content:string;status:string;priority:string}[]}|undefined)?.opencode_todos??[];
   const traceTurns=useMemo(()=>activityTurns(events),[events]);
   const savedTurns=(run?.data as {turns?:SavedTurn[]}|undefined)?.turns??[];
   const queueData=run?.data as {prompt_queue?:{id:string;prompt:string;mode:Mode;model:string;reasoningEffort:ReasoningEffort;deviceId:string|null}[];queue_paused?:boolean;native_build?:any;design?:DesignRecord;failure?:{code:string;effectiveOutputTokens:number;reasoningEffort:string}}|undefined;
   const [inspectedDesignFingerprint,setInspectedDesignFingerprint]=useState(''),[designHighlights,setDesignHighlights]=useState<string[]>([]),[selectedDesignElement,setSelectedDesignElement]=useState('');
   const plannedCandidate=queueData?.design?.candidates.find(c=>c.fingerprint===inspectedDesignFingerprint)??queueData?.design?.candidates.find(c=>c.fingerprint===queueData.design?.selected)??queueData?.design?.candidates[0];
   const separateNativeFollowup=Boolean(queueData?.native_build&&!queueData.native_build.design);
   const promptQueue=queueData?.prompt_queue??[];
 const draftReferences=[...(queueData?.design?.feedback??[]),...(queueData?.design?.history??[]).flatMap(row=>row.feedback??[])].filter(row=>prompt.includes(JSON.stringify(row))).slice(-6);
 const currentRun=useRef(run);currentRun.current=run;
 const setRun=(value:Run|null)=>setProjection(previous=>value?reduceProjection(previous,{snapshot:value}):emptyProjection<Run>());

 const [error,setError]=useState(''),[connected,setConnected]=useState(false);
  const [blockedChat,setBlockedChat]=useState<{id:string;message:string}|null>(null);
 const [connectionNotice,setConnectionNotice]=useState('');
 const [sourceDrafts,setSourceDrafts]=useState<Record<string,ComposerSource[]>>({}),[mediaBusy,setMediaBusy]=useState(false);
 const sourceKey=runId||(newProject?'new:'+newProject:'new'),sources=sourceDrafts[sourceKey]??[];
 const [savedSources,setSavedSources]=useState<ComposerSource[]>([]),[selectedSourceId,setSelectedSourceId]=useState('');
 const selectedSource=savedSources.find(row=>row.id===selectedSourceId)??savedSources.find(row=>row.image);
 const sourceIds=Array.from(new Set(run?.conversation?.flatMap(turn=>turn.attachmentIds??[])??[])).join(',');
 useEffect(()=>{let live=true;setSavedSources([]);setSelectedSourceId('');if(window.desktop&&sourceIds)void Promise.all(sourceIds.split(',').map(id=>window.desktop!.previewAttachment(id))).then(values=>{if(live)setSavedSources(values.map(value=>({...value.attachment,image:value.image})));}).catch(()=>{if(live)setConnectionNotice('Some saved source previews are unavailable; task results remain saved.');});return()=>{live=false;};},[sourceIds,runId]);
 const setSources=(value:ComposerSource[])=>setSourceDrafts(previous=>({...previous,[sourceKey]:value}));
 useEffect(()=>{const update=()=>{try{applyAppearance(parseAppearance(JSON.parse(localStorage.getItem('datumm-appearance')??JSON.stringify(defaultAppearance))));}catch{applyAppearance(defaultAppearance);}};update();const system=matchMedia('(prefers-color-scheme: dark)');system.addEventListener('change',update);return()=>system.removeEventListener('change',update);},[]);
 useEffect(()=>{for(const name of ['contrast','motion','density','scale']){const value=localStorage.getItem('datumm-'+name);if(value)document.documentElement.dataset[name]=value;}},[]);
  const submissionKey=useRef<{signature:string;key:string;body?:Record<string,unknown>}|null>(null);
  const queueRetry=useRef<{signature:string;id:string}|null>(null);
 const commandRetry=useRef(new Map<string,{schemaVersion:2;idempotencyKey:string;expectedTaskVersion:number;expectedPlanVersion:number;command:Record<string,unknown>}>());
 const commandExpected=useRef<{taskId:string;taskVersion:number;planVersion:number}|null>(null);
 const expectedVersion=()=>{
  const known=commandExpected.current;
  return known&&run&&known.taskId===run.id&&known.taskVersion>(run.taskVersion??0)?known:{taskId:run?.id??'',taskVersion:run?.taskVersion??0,planVersion:run?.currentPlanRef?.version??0};
 };
 const taskCommand=async(command:Record<string,unknown>)=>{
  if(!run)throw new Error('Open the saved task first.');
   const epoch=recoveryEpoch.current;
  const signature=JSON.stringify({taskId:run.id,command});
   let request=commandRetry.current.get(signature);
   if(!request){
    if(command.type==='change_mode'){
     const saved=await api<Run>(`tasks/${run.id}`);if(epoch!==recoveryEpoch.current)throw new Error('Task view changed. The original draft is preserved.');setRun(saved);
     commandExpected.current={taskId:saved.id,taskVersion:saved.taskVersion??0,planVersion:saved.currentPlanRef?.version??0};
    }
    const expected=expectedVersion();
   request={schemaVersion:2,idempotencyKey:crypto.randomUUID(),expectedTaskVersion:expected.taskVersion,expectedPlanVersion:expected.planVersion,command:{schemaVersion:2,...command}};
   commandRetry.current.set(signature,request);
  }
  let result:{state:string;taskVersion:number;error?:string};
  try{result=await api(`tasks/${run.id}/commands`,'POST',request);}
  catch(e){
   const status=(e as Error&{status?:number}).status;
   if(status&&status<500){
    commandRetry.current.delete(signature);
    try{
      const saved=await api<Run>('tasks/'+run.id);if(epoch!==recoveryEpoch.current)throw e;setRun(saved);
     commandExpected.current={taskId:saved.id,taskVersion:saved.taskVersion??0,planVersion:saved.currentPlanRef?.version??0};
    }catch{}
   }
   throw e;
  }
  if(replaceTerminalCommand(command.type,result.state))commandRetry.current.delete(signature);
  if(result.state!=='applied')throw new Error(result.error??'The command was accepted and is still being applied. Check the saved task before retrying.');
   if(epoch===recoveryEpoch.current)commandExpected.current={taskId:run.id,taskVersion:result.taskVersion,planVersion:request.expectedPlanVersion};
  commandRetry.current.delete(signature);
  return result;
 };

  const [left,setLeft]=useState(true),[right,setRight]=useState(false),[tab,setTab]=useState<'assistant'|'preview'|'activity'|'exports'|'tools'>('preview');
 const settingsPreviousLeft=useRef<boolean|null>(null);
 const changeSettingsOpen=useCallback((open:boolean)=>{
  setSettingsOpen(open);
  if(!open&&window.location.hash==='#settings'){const url=new URL(window.location.href);url.hash='';window.history.replaceState(null,'',url);}
  if(!open)requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.desktop-navigation-header .desktop-panel-toggle')?.focus()));
 },[]);
 useEffect(()=>{
  const open=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.key===','){event.preventDefault();changeSettingsOpen(true);}};
  window.addEventListener('keydown',open);
  return()=>window.removeEventListener('keydown',open);
 },[desktopPreview,changeSettingsOpen]);
 useEffect(()=>{
  const transition=settingsSidebarTransition(settingsOpen,true,left,settingsPreviousLeft.current);
  settingsPreviousLeft.current=transition.previousLeft;
  if(transition.left!==left)setLeft(transition.left);
 },[settingsOpen,left]);
 useEffect(()=>{
  
  const sync=()=>changeSettingsOpen(window.location.hash==='#settings');
  sync();window.addEventListener('hashchange',sync);
  return()=>window.removeEventListener('hashchange',sync);
 },[changeSettingsOpen]);
 const [studioView,setStudioView]=useState<'workspace'|'activity'|'schedules'>('workspace');
 const [activityFilter,setActivityFilter]=useState('all');
 const [activitySelection,setActivitySelection]=useState('');
 useEffect(()=>setTab('preview'),[]);
 const [viewportReady,setViewportReady]=useState(false);
 const [dismissedWorkflow,setDismissedWorkflow]=useState('');
 const [panelWidths,setPanelWidths]=useState({left:200,right:440});
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('datumm-panel-widths')??'null');if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.right))setPanelWidths({left:Math.max(180,Math.min(440,saved.left===242?200:saved.left)),right:Math.max(240,Math.min(620,saved.right===316?440:saved.right))});}catch{}},[]);
 const resizePanel=(side:'left'|'right',width:number)=>setPanelWidths(previous=>{const next={...previous,[side]:width};try{localStorage.setItem('datumm-panel-widths',JSON.stringify(next));}catch{}return next;});

 const [deviceDialog,setLegacyDeviceDialog]=useState(false),[pairing,setPairing]=useState(''),[search,setSearch]=useState(''),[actionBusy,setActionBusy]=useState(false);
 const [localConnections,setLocalConnections]=useState(false);
 const setDeviceDialog=(open:boolean)=>liveRuntime?setLocalConnections(open):setLegacyDeviceDialog(open);
const [accessDialog,setAccessDialog]=useState(false),[accessBatches,setAccessBatches]=useState(1),[accessMargin,setAccessMargin]=useState(0),[accessReview,setAccessReview]=useState<AccessReview|null>(null);
const [placementContext,setPlacementContext]=useState<PlacementContext|null>(null),[placementTask,setPlacementTask]=useState('');
const [placementX,setPlacementX]=useState(''),[placementY,setPlacementY]=useState(''),[placementRotation,setPlacementRotation]=useState(''),[placementView,setPlacementView]=useState('');
const [confirmedPlacement,setConfirmedPlacement]=useState<NativePlacement|null>(null);
 const [historyView,setHistoryView]=useState<'recent'|'archived'>('recent'),[deleteTarget,setDeleteTarget]=useState<Run|null>(null),[deleteAllOpen,setDeleteAllOpen]=useState(false),[deletePhrase,setDeletePhrase]=useState('');
 const [canvasOpen,setCanvasOpen]=useState(false),[canvasZoom,setCanvasZoom]=useState(1);
 const [designVersion,setDesignVersion]=useState<VariableVersion|null>(null),[designDiff,setDesignDiff]=useState<string>('');
 const [drawingError,setDrawingError]=useState(''),[drawingMissing,setDrawingMissing]=useState(false),[drawingLoading,setDrawingLoading]=useState(false),[drawingRetry,setDrawingRetry]=useState(0),[compareVersion,setCompareVersion]=useState<VariableVersion|null>(null);
 const [drawingStyle,setDrawingStyle]=useState<'presentation'|'linework'>('presentation');
 const reviewEpoch=useRef(0);
 const canvasTrigger=useRef<HTMLButtonElement|null>(null);
 const dialogTrigger=useRef<HTMLElement|null>(null);
 const pendingSubmission=useRef<{text:string;runStarted:boolean;taskId?:string;sourceKey:string}|null>(null);
 const recoveryEpoch=useRef(0),promptDrafts=useRef<Record<string,string>>({});
 const recoverLiveView=(taskId?:string)=>{const epoch=recoveryEpoch.current;setError('');setConnectionNotice('Checking the saved task after the live stream ended…');if(taskId)void api<Run>('tasks/'+encodeURIComponent(taskId)).then(task=>{if(recoveryEpoch.current===epoch){setRun(task);setConnectionNotice(savedTaskConnectionNotice(task));}}).catch(()=>{if(recoveryEpoch.current===epoch)setConnectionNotice('Saved task updates are unavailable. Check the connection before retrying; this message was already admitted.');});};
 const openCanvas=(trigger:HTMLButtonElement)=>{canvasTrigger.current=trigger;setCanvasZoom(1);setCanvasOpen(true);};
 const restoreDialogFocus=(event:Event)=>{event.preventDefault();const trigger=dialogTrigger.current?.isConnected?dialogTrigger.current:document.querySelector<HTMLElement>('button[aria-label="Show sidebar"],button[aria-label="Account settings"],[aria-label="Search tasks"]');trigger?.focus();};
 const planSummary=run?.data.plan?`Plan revision ${run.data.plan.version} is ready. Review the layout below, describe a change, or build this version in Revit.`:null;
 const outcome=run?.modelOutcome;
 const proposalExpired=Boolean(run?.data.proposal?.expiresAt&&Date.parse(run.data.proposal.expiresAt)<=Date.now());
 const committedBuild=outcome?.state==='committed_unverified'||outcome?.state==='committed_verified';
 const canRefreshFailedPreparation=Boolean(run?.status==='failed'&&(run.data.variable_selection||run.data.m09_revision)&&run.data.proposal&&!committedBuild&&['preparation_read_unavailable','native_busy','connection_error'].includes(run.data.failure?.code??''));
 const canEndFailedPreparation=Boolean(run?.status==='failed'&&run.data.variable_selection&&!committedBuild&&run.data.recovery?.data?.state==='rolled_back'&&run.data.recovery.data.sameDocument===true);
 const plannedAccessBatches=Math.min(3,run?.data.agent_task_plan?.steps.filter(step=>step.action==='execute_changes').length??1);
 const batchInProgress=run?.data.agent_result?.status==='in_progress'&&['running','queued','awaiting_approval'].includes(run.status);
 const partialGoal=run?.data.agent_result?.status==='partial';
 const confirmedAnnotationFailure=outcome?.verifiedBatches===1&&run?.data.recovery?.data?.state==='failed'&&run.data.recovery.data.sameDocument===true;
 const buildSummary=run?.mode==='build'?run.status==='awaiting_approval'?`${outcome?.verifiedBatches?`${outcome.verifiedBatches} native batch verified. Tags and dimensions require a separate exact approval. `:''}The rollback dry run passed. Review the exact proposal below and approve it to build in Revit. No model changes were made by the dry run.`:outcome?.verifiedBatches&&!outcome.completedBuild?`${outcome.verifiedBatches} of ${outcome.expectedBatches} native batches passed read-back. The full build remains incomplete; inspect the pending or failed operation before continuing.`:batchInProgress?`${run.data.agent_result?.batchHistory?.length??1} native batch verified. DATUMM is checking the updated model before the next planned step.`:partialGoal?(outcome?.verified?'Revit verified the recorded native changes, but the overall goal remains partial. Review the remaining criteria below.':'The overall goal remains partial. Review the findings and verification limits below.'):outcome?.verified?`${queueData?.native_build?'The approved native proposal':run.data.draft_task?'The drafting task':run.data.variable_selection?'The selected concept':run.data.selected_plan?'The saved plan':'The verified 3BHK demonstration'} was built and verified in Revit. Review the element counts and save the project when you are ready.`:run.status==='failed'?(committedBuild?'The build committed in Revit. Full verification is unavailable; review the operation status below. Do not rebuild this plan.':outcome?.state==='unknown'?'The write outcome is unknown. Reconnect and check the original operation status before any new build.':'The build stopped. Review the error below.'):null:null;
 const checkpointSummary=run?.status==='paused_limit'?
  run.data.operation_id?'The task paused after a Revit operation. Check its original status before starting another build.':
  run.data.agent_limit?.continuationAvailable?'The findings are saved. Continue the remaining analysis from this checkpoint when you are ready.':
  'This task cannot continue from its checkpoint. Review the saved findings and start a focused follow-up task.':null;
 const responseSummary=checkpointSummary??buildSummary??planSummary;
 const eventDetail=(event:RunEvent)=>run?.status==='paused_limit'&&event.stage==='answer'?checkpointSummary??event.detail:
  event.stage==='paused_limit'?'Progress saved. Review the findings and choose the next step.':
  event.stage==='answer'&&run?.mode==='build'&&run.data.selected_plan
  ?`Saved plan revision ${run.data.selected_plan.version} selected for Revit validation.`:event.detail;
 const inspectedCounts=run?.data.agent_inspection?.counts;
 const checkpointFindings=run?.status==='paused_limit'?[
  inspectedCounts?`Connected model: ${Object.entries(inspectedCounts).filter(([,count])=>count>0).map(([category,count])=>`${count} ${category}`).join(' · ')||'no supported elements found'}.`:null,
  ...(run.data.agent_task_plan?.steps.filter(step=>taskStepCompleted(run,step)).slice(0,2).map(step=>`${step.title} completed.`)??[]),
 ].filter((finding):finding is string=>Boolean(finding)):[];
 const verifiedNativeBatches=run?.data.native_batches?.filter(batch=>batch.verified&&batch.receipt.state==='committed')??[];
 const verifiedCount=outcome?.verified?(verifiedNativeBatches.length?new Set(verifiedNativeBatches.flatMap(batch=>batch.receipt.elementIds)).size:outcome.present):null;
 const verifiedBatchCount=verifiedNativeBatches.length||run?.data.agent_result?.batchHistory?.length||0;
 const verifiedCounts=verifiedNativeBatches.length?verifiedNativeBatches.reduce<Record<string,number>>((counts,batch)=>{for(const [kind,count] of Object.entries(batch.compiled.counts))counts[kind]=(counts[kind]??0)+count;return counts;},{}):verifiedBatchCount>1?run?.data.agent_result?.changes:run?.data.compiled?.counts;
 const verifiedBreakdown=verifiedCounts?Object.entries(verifiedCounts).filter(([,count])=>count>0).map(([name,count])=>`${count} ${(count===1?name.replace(/s$/,''):name).replaceAll('_',' ')}`).join(' · '):null;
 const completedGoal=run?.data.agent_result?.goal==='Build this exact drafting task'?run.data.agent_draft?.requestedGoal??run.data.draft_task?.requestedGoal??(run.data.agent_draft?.changes.title?completedDraftTitle(run.data.agent_draft.changes.title):run.data.agent_result.goal):run?.data.agent_result?.goal;
 const completedCriteria=run?.data.agent_result?.criteria?reviewCriteria(run.data.agent_result.criteria):[];
 const selectedDesignCandidate=run?.data.agent_design?.candidates.find(c=>c.planId===designVersion?.planId&&c.version===designVersion?.version)??run?.data.agent_design?.candidates.find(c=>c.planId===run.currentPlanRef?.planId&&c.version===run.currentPlanRef.version)??run?.data.agent_design?.candidates[0];
 const drawingCurrent=Boolean(designVersion&&run?.currentPlanRef?.planId===designVersion.planId&&run.currentPlanRef.version===designVersion.version&&run.currentPlanRef.fingerprint===designVersion.fingerprint);
 const reviewAssumptions=Array.from(new Set([...(run?.data.agent_design?.assumptions??[]),...(designVersion?.graph.assumptions??[])]));
 const planAccepted=Boolean(drawingCurrent&&run?.acceptance?.plan.planId===designVersion?.planId&&run?.acceptance?.plan.version===designVersion?.version&&run?.acceptance?.plan.fingerprint===designVersion?.fingerprint);
 const buildStep=run?.data.agent_design?planBuildStep(run,drawingCurrent&&!drawingError?designVersion:null,placementTask===run.id&&Boolean(confirmedPlacement)):null;
 const designOwner=useRef('');
 useEffect(()=>{
  if(designOwner.current!==(run?.id??'')){designOwner.current=run?.id??'';setDesignVersion(null);}
  const ref=run?.currentPlanRef;if(!run?.data.agent_design||ref?.source!=='variable')return;
  let cancelled=false;setDrawingLoading(true);setDrawingError('');setDrawingMissing(false);setCompareVersion(null);
  void api<VariableVersion>(`variable/plans/${ref.planId}/versions/${ref.version}${drawingRetry?'?retryRender=true':''}`).then(value=>{
   if(cancelled)return;if(value.fingerprint!==ref.fingerprint)throw Error('Saved drawing fingerprint changed.');setDesignVersion(value);setDrawingStyle('presentation');
  }).catch(e=>{if(!cancelled){setDrawingError((e as Error).message);setDrawingMissing((e as Error&{status?:number}).status===404);}}).finally(()=>{if(!cancelled)setDrawingLoading(false);});
  return()=>{cancelled=true;};
 },[run?.id,run?.currentPlanRef?.planId,run?.currentPlanRef?.version,run?.currentPlanRef?.fingerprint,drawingRetry]);
 const conceptBinding=run?.data.agent_design?.conceptImage?.planBinding;
 const conceptImageAlternative=conceptBinding?(run?.data.agent_design?.candidates.findIndex(c=>c.planId===conceptBinding.planId&&c.version===conceptBinding.version&&c.fingerprint===conceptBinding.fingerprint)??-1):-1;
 const conceptImageLabel=conceptImageAlternative>=0?`Plan alternative ${conceptImageAlternative+1}`:conceptBinding?`Saved plan version ${conceptBinding.version}`:'Illustrative only';
 const conceptMatchesSelected=Boolean(conceptBinding&&selectedDesignCandidate&&conceptBinding.planId===selectedDesignCandidate.planId&&conceptBinding.version===selectedDesignCandidate.version&&conceptBinding.fingerprint===selectedDesignCandidate.fingerprint);
   const previewSvg=plannedCandidate?.svg??(drawingCurrent&&designVersion?designVersion.svg:queueData?.native_build?.svg??run?.data.compiled?.svg??run?.data.agent_draft?.previewSvg??run?.data.agent_design?.previewSvg??run?.data.snapshot?.svg);
 // Drawing state belongs to the open chat: with no chat open nothing is renderable.
 const activeDrawing=plannedCandidate?candidateDrawing(plannedCandidate):run?designVersion:null;
 const hasRenderablePlan=Boolean(run)&&isRenderablePlan(activeDrawing,previewSvg);
 const previewExportQuery=run?.data.agent_design&&designVersion&&run.data.agent_design.candidates.some(c=>c.planId===designVersion.planId&&c.version===designVersion.version)?`?planId=${encodeURIComponent(designVersion.planId)}&version=${designVersion.version}`:'';
 const previewCounts=run?.data.compiled?.counts??run?.data.agent_inspection?.counts??run?.data.inventory?.counts??{};
 const previewRooms=run?.data.compiled?.areas??(run?.data.agent_design&&designVersion&&selectedDesignCandidate?.planId===designVersion.planId&&selectedDesignCandidate.version===designVersion.version&&selectedDesignCandidate.fingerprint===designVersion.fingerprint?designVersion.graph.rooms.map(r=>({name:r.name,expectedAreaM2:Math.max(0,r.rect[2]-r.rect[0]-designVersion.graph.wallThicknessMm)*Math.max(0,r.rect[3]-r.rect[1]-designVersion.graph.wallThicknessMm)/1_000_000})):null)??run?.data.agent_design?.previewRooms??run?.data.inventory?.rooms.map(r=>({name:r.name,expectedAreaM2:r.areaM2}))??[];
  const previewLabel=plannedCandidate&&separateNativeFollowup?'Saved design reference · excludes the separate native proposal':queueData?.native_build?.svg?'Exact native proposal · schematic symbols':drawingCurrent?(run?.acceptance?.plan.fingerprint===designVersion?.fingerprint?'Accepted dimensioned plan':'Dimensioned concept plan'):run?.data.agent_design?'Older alternative preview · current drawing unavailable':outcome?.verified&&run?.data.draft_task?'Verified drafting comparison':run?.data.agent_draft&&!run.data.compiled?'Proposed drafting paths and positions':run?.data.compiled?'Proposed floor plan':'Measured model geometry';
 const previewRevision=run?.data.plan?.version??run?.data.selected_plan?.version??run?.data.proposal?.revision??run?.data.snapshot?.revision;
 const hasNativeQuantities=Boolean(run?.data.agent_quantity_pages?.length);
  const exportItems=runtimeConfig?.supportedExports?[
   {ext:'json',name:offlineFixture?'Fixture task record':'Task and tool evidence',icon:FileJson,detail:'Exact result, task version and events'},
   {ext:'md',name:offlineFixture?'Fixture answer':'Answer Markdown',icon:FileJson,detail:offlineFixture?'Offline validation result as Markdown':'Saved reasoning answer as Markdown'},
   {ext:'docx',name:'Saved answer (Word)',icon:FileJson,detail:'Latest saved answer and task version; no native verification'},
    {ext:'handoff',name:offlineFixture?'Fixture handoff':'Task handoff',icon:FileJson,detail:'Portable saved task result'},
    {ext:'plan',name:'Structured plan.md',icon:FileJson,detail:'Goal, exact design identity, rooms, review steps and saved context'},
    ...(queueData?.native_build?.svg?[{ext:'svg',name:'Native proposal SVG',icon:LayoutTemplate,detail:'Exact proposed coordinates; schematic symbols'}]:[])
  ].filter(item=>runtimeConfig.supportedExports?.includes(item.ext)):[
  ...(run?[{ext:'pdf',name:'PDF report',icon:FileJson,detail:'Source, coverage, quantities and limitations'},{ext:'docx',name:'Word report',icon:FileJson,detail:'Editable source-aware task report'},{ext:'md',name:'Markdown report',icon:FileJson,detail:'Portable proposed, measured or verified findings'},{ext:'xlsx',name:'BOQ workbook',icon:FileSpreadsheet,detail:'BOQ, elements and provenance'},{ext:'csv',name:'BOQ and elements CSV',icon:FileSpreadsheet,detail:'Source-bound quantities and element rows'},{ext:'report-json',name:'Report dataset JSON',icon:FileJson,detail:'Unified versioned report with artifact links'}]:[]),
  ...(hasNativeQuantities?[{ext:'analysis-json',name:'Native evidence JSON',icon:FileJson,detail:'Frozen grouped host quantities and coverage'}]:[]),
  ...(run&&(run.data.agent_element_pages?.some(page=>page.coverage.returnedCount>0)||
    outcome?.verified&&Boolean(run.data.verification?.elements?.length||run.data.recovery?.data?.elements?.length))
    ?[{ext:'elements-csv',name:'Inspected elements CSV',icon:FileSpreadsheet,detail:'Native instance IDs, phases and available dimensions'}]:[]),
  {ext:'json',name:'Run record',icon:FileJson,detail:'Task context, events and verification'},
  ...(previewSvg?[{ext:'svg',name:'Plan SVG',icon:LayoutTemplate,detail:previewLabel}]:[]),
  ...(run?.data.agent_native_image?[{ext:'native-png',name:'Native Revit plan PNG',icon:Download,detail:`${run.data.agent_native_image.viewName} · ${run.data.agent_native_image.width} × ${run.data.agent_native_image.height} · revision ${run.data.agent_native_image.revision}`}]:[]),
  ...(run?.data.agent_native_image?[{ext:'native-jpeg',name:'Native Revit plan JPEG',icon:Download,detail:'Same native view with a white background'}]:[]),
  ...(run?.data.concept?[{ext:'concept',name:'AI concept image',icon:Download,detail:conceptBinding?`${conceptImageLabel} · version ${conceptBinding.version} · illustrative only`:'Illustrative only, not measured geometry'}]:[])
 ];

 const transport=useMemo(()=>new DefaultChatTransport({api:'/api/chat',prepareSendMessagesRequest:({messages,body})=>{
  // History and tool evidence live in the task store; only admit the new user text.
  const latest=messages.filter(message=>message.role==='user').at(-1);
  return {body:{...body,messages:latest?[{id:latest.id,role:'user',parts:latest.parts.filter(part=>part.type==='text')}]:[]}};
 }}),[]);

 const {messages,sendMessage,status,setMessages,stop,error:chatError}=useChat({transport,onData:part=>{

  if(!pendingSubmission.current)return;
  if(part.type==='data-run'){
   if(pendingSubmission.current){pendingSubmission.current.runStarted=true;pendingSubmission.current.taskId=(part.data as {id:string}).id;const key=pendingSubmission.current.sourceKey;setSourceDrafts(previous=>({...previous,[key]:[]}));}
   submissionKey.current=null;
   setRunId((part.data as {id:string}).id);
  }

  if(part.type==='data-progress'){

   const event=part.data as RunEvent&{run?:Run};

   if(event.stage==='snapshot'&&event.run){setRun(event.run);}

   else setProjection(previous=>reduceProjection(previous,{event}));

  }

 }});

 const paused=Boolean(run&&terminal.has(run.status))||terminal.has(events.at(-1)?.stage??'');
 const executing=!paused&&(status==='streaming'||status==='submitted'||Boolean(run&&!terminal.has(run.status)));
 const replying=useRef(false);
  const busy=executing||actionBusy||mediaBusy;
  const queueMessage=liveRuntime&&Boolean(run)&&(executing||promptQueue.length>0);

 // A refused first prompt never created a task: take its optimistic bubble back (the text returns to the composer).
 const dropOptimistic=(text:string)=>setMessages(list=>{const i=list.map(m=>m.role==='user'&&m.parts.some(p=>p.type==='text'&&p.text===text)).lastIndexOf(true);return i<0?list:list.filter((_,k)=>k!==i);});
 useEffect(()=>{
  if(!chatError)return;
  const pending=pendingSubmission.current;
   if(!pending)return;
  if(pending&&!pending.runStarted){setPrompt(current=>current||pending.text);if(!currentRun.current)dropOptimistic(pending.text);}
  pendingSubmission.current=null;
  if(pending?.runStarted){
   recoverLiveView(pending.taskId||currentRun.current?.id);return;
  }
  const failure=chatStartFailure(chatError);
  if(failure){
   setError(failure.message+' Your prompt is preserved.');
    setBlockedChat(failure.blockingTask?{id:failure.blockingTask.id,message:failure.message}:null);
   if(failure.state==='rejected')submissionKey.current=null;
   if(runId)void api<Run>('tasks/'+encodeURIComponent(runId)).then(value=>{
    if(currentRun.current?.id!==value.id)return;
    setRun(value);
    commandExpected.current={taskId:value.id,taskVersion:value.taskVersion??0,planVersion:value.currentPlanRef?.version??0};
   }).catch(()=>{});
   return;
  }
  setError('DATUMM could not start this chat. Check its saved status before retrying; your prompt is preserved.');
 },[chatError]);
 useEffect(()=>{if(connectionNotice&&run)setConnectionNotice(savedTaskConnectionNotice(run));},[run?.status,nativeQuestions.length]);

  const selectedDevice=devices.find(d=>d.id===deviceId);
  useEffect(()=>{
   if(!liveRuntime||!useCurrentModel||!selectedDevice?.online){setNativeContext(null);setNativeContextError('');return;}
   let live=true;setNativeContext(null);
   const stop=settledPoll(async()=>{try{const value=await api<{sessionId:string;observedAt:string;context:Record<string,unknown>}>(`devices/${selectedDevice.id}/context`);if(live){setNativeContext(value);setNativeContextError('');}}catch(error){if(live){setNativeContext(null);setNativeContextError((error as Error).message);}}},10000);
   return()=>{live=false;stop();};
  },[liveRuntime,useCurrentModel,selectedDevice?.id,selectedDevice?.online]);

 useEffect(()=>{
  const narrow=window.matchMedia('(max-width:850px)');
  const update=()=>{setLeft(!narrow.matches);setRight(!narrow.matches);setViewportReady(true);};
  update();narrow.addEventListener('change',update);
  return()=>narrow.removeEventListener('change',update);
 },[]);

 useEffect(()=>{
  const closeDrawer=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('[role="dialog"][data-state="open"]'))return;
   if(left&&window.matchMedia('(max-width:850px)').matches){
    setLeft(false);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('button[aria-label="Show sidebar"]')?.focus());return;
   }
   if(right&&window.matchMedia('(max-width:850px)').matches){
    setRight(false);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('button[aria-label="Show inspector"]')?.focus());
   }
  };
  document.addEventListener('keydown',closeDrawer);
  return()=>document.removeEventListener('keydown',closeDrawer);
 },[left,right]);

 const refreshRuns=useCallback(async()=>{
   if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return true;
   const epoch=accountEpoch.current;
   try{const history=await api<Run[]>('runs'+(historyView==='archived'?'?archived=true':''));if(epoch===accountEpoch.current){setRuns(history);setConnected(true);}return true;}
   catch{if(epoch===accountEpoch.current)setConnected(false);return false;}
 },[historyView,desktopPreview,accountStatus?.state,testIdentity]);
 const refresh=useCallback(async()=>{
   if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return true;
   const epoch=accountEpoch.current;
   try{const [configuration,list,history,tools]=await Promise.all([api<RuntimeConfig>('config'),api<Device[]>('devices'),api<Run[]>('runs'+(historyView==='archived'?'?archived=true':'')),Promise.resolve<McpTool[]>([])]);
    if(epoch!==accountEpoch.current)return true;
    setRuntimeConfig(configuration);setMcpTools(tools);
   void api<ProjectRow[]>('projects'+(!desktopAvailable&&historyView==='archived'?'?archived=true':'')).then(value=>{if(epoch===accountEpoch.current&&Array.isArray(value)){setProjects(value);setProjectsSupported(true);}}).catch(failure=>{if(epoch===accountEpoch.current&&!desktopAvailable&&notSupported(failure))setProjectsSupported(false);});

   setConnected(true);setModels(configuration.models);if(!modelPreferenceInitialized.current){const taskFromUrl=new URLSearchParams(window.location.search).get('task');if(!taskFromUrl){setModel(configuration.defaultModel??'openai/gpt-6-luna');setReasoningEffort(configuration.defaultReasoningEffort??'high');}modelPreferenceInitialized.current=true;}setDevices(list);setRuns(history);

   setDeviceId(previous=>previous||list.find(d=>d.online)?.id||'');
   return true;
  }catch{if(epoch===accountEpoch.current)setConnected(false);return false;}finally{if(epoch===accountEpoch.current)setWorkspaceReady(true);}

 },[historyView,desktopPreview,accountStatus?.state,testIdentity]);

 useEffect(()=>{
  if(!desktopAvailable||desktopPreview)return;
  if(!admittedSubject){accountEpoch.current++;return;}
  if(accountWorkspaceSubject===admittedSubject)return;
  let active=true;
  accountEpoch.current++;
  if(accountWorkspaceSubject){
   setRuns([]);setProjects([]);setRun(null);setRunId('');setMessages([]);setPrompt('');setNewProject('');setMode('plan');setSourceDrafts({});setSavedSources([]);setSelectedSourceId('');
   setUseCurrentModel(false);setDesignVersion(null);setDesignDiff('');setCompareVersion(null);setInspectedDesignFingerprint('');setDesignHighlights([]);setSelectedDesignElement('');setPlanningGoalOpen(false);
   promptDrafts.current={};placementDrafts.current.clear();notificationStates.current.clear();pendingSubmission.current=null;submissionKey.current=null;queueRetry.current=null;commandRetry.current.clear();commandExpected.current=null;recoveryEpoch.current++;
   modelPreferenceInitialized.current=false;setError('');setConnectionNotice('');
   const url=new URL(window.location.href);url.searchParams.delete('task');window.history.replaceState(null,'',url);
  }
  setWorkspaceReady(false);setConnected(false);void stop();
  void refresh().then(()=>{if(active)setAccountWorkspaceSubject(admittedSubject);});
  return()=>{active=false;};
 },[desktopAvailable,desktopPreview,admittedSubject,accountWorkspaceSubject,refresh,stop]);

 const projectContextChanged=async()=>{
  const selectedId=runId;await refresh();
  if(!selectedId||currentRun.current?.id!==selectedId)return;
  const updated=await api<Run>(`tasks/${selectedId}`);
  if(currentRun.current?.id===selectedId)setRun(updated);
 };

  // One stable loop: chat list every 6 s while a chat runs (else 30 s); config, devices and projects every 60 s.
  const loopRefs=useRef({refresh,refreshRuns,runs});loopRefs.current={refresh,refreshRuns,runs};
  const firstRefresh=useRef(true);
  useEffect(()=>{
   let last=0;
   return settledPoll(()=>{
    if(Date.now()-last>=60000){last=Date.now();return loopRefs.current.refresh();}
    return loopRefs.current.refreshRuns();
   },()=>listPollMs(loopRefs.current.runs));
  },[]);
  // The loop covers the first load; later identity changes (archive filter, account) reload at once.
  useEffect(()=>{if(firstRefresh.current){firstRefresh.current=false;return;}void refresh();},[refresh]);
 useEffect(()=>{try{const value=JSON.parse(localStorage.getItem('datumm-seen-versions')??'{}');if(value&&typeof value==='object'&&!Array.isArray(value))setSeen(value);}catch{}},[]);
 useEffect(()=>{setSeen(previous=>{const next=advanceSeen(previous,runs,runId);if(next!==previous){try{localStorage.setItem('datumm-seen-versions',JSON.stringify(next));}catch{}}return next;});},[runs,runId]);
  const providerChanged=(value:ProviderStatus,applied=false)=>{
   setProviderStatus(value);
    if(applied){modelPreferenceInitialized.current=true;setModel(value.preferences.defaultModel);}void refresh();
  };
  const chatModels=desktopAvailable?models.filter(id=>providerStatus?.state==='connected'&&providerStatus.preferences.models.includes(id)&&providerStatus.models.some(row=>row.id===id)):models;

  useEffect(()=>{
   if(liveRuntime){setRevitSessions(devices.length);return;}
   if(!selectedDevice?.online){setRevitSessions(null);return;}
  let live=true;const check=async()=>{try{const sessions=await api<{sessionId:string}[]>(`devices/${selectedDevice.id}/tools`,'POST',{name:'list_revit_sessions',arguments:{}});if(live)setRevitSessions(sessions.length);}catch{if(live)setRevitSessions(null);}};
  const stop=settledPoll(check,7000);return()=>{live=false;stop();};
  },[selectedDevice?.id,selectedDevice?.online,liveRuntime,devices.length]);

 useEffect(()=>{
  if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return;
   const epoch=recoveryEpoch.current;let live=true;
  const taskId=new URL(window.location.href).searchParams.get('task');
   if(taskId)void api<Run>('tasks/'+encodeURIComponent(taskId)).then(value=>{if(!live||epoch!==recoveryEpoch.current)return;setRun(value);setRunId(value.id);setMode(value.mode);setModel(value.model);setReasoningEffort(value.reasoningEffort??'high');}).catch(e=>{if(live&&epoch===recoveryEpoch.current)setError((e as Error).message);});
   return()=>{live=false;};
 },[desktopPreview,accountStatus?.state,testIdentity]);

 useEffect(()=>{
  if(!runId)return;
  const url=new URL(window.location.href);
  url.searchParams.set('task',runId);
  window.history.replaceState(null,'',url);
 },[runId]);

 const openPollMs=openChatPollMs(run?.id===runId?run.status:undefined);
 useEffect(()=>{
  if(!runId||openPollMs===null)return;
  let live=true;const tick=async()=>{const value=await api<Run>('runs/'+runId);if(live)setRun(value);};
  const stop=settledPoll(tick,openPollMs);return()=>{live=false;stop();};
 },[runId,openPollMs]);

 const replyToQuestion=async(payload:ReplyPayload|{question_id:string;answer:string})=>{
  if(!run||replying.current)throw new Error('Your answer is already being sent.');
  replying.current=true;setActionBusy(true);setError('');
  try{
   try{await taskCommand({type:'answer',questionId:payload.question_id,questionVersion:('question_version' in payload?payload.question_version:undefined)??run.data.agent_question?.version??1,...('answer' in payload?{answer:payload.answer}:{answers:payload.answers})});}
   catch(failure){
    // A lost HTTP response can follow an accepted atomic resume. Read its
    // receipt before offering a retry; never create a second task.
    const current=await api<Run>(`runs/${run.id}`).catch(()=>null);
    if(current?.data.agent_reply_receipt?.questionId!==payload.question_id)throw failure;
   }
   setPrompt('');
   const current=await api<Run>(`runs/${run.id}`).catch(()=>null);
   setRun(current??{...run,status:'queued',data:{...run.data,agent_question:undefined}});
  }finally{replying.current=false;setActionBusy(false);}
 };

  const submit=async(text=prompt,recipe=false,override?:Mode,variableSelection?:VariableBinding,draftFingerprint?:string)=>{
   if(!hasPromptContent(text)||actionBusy||mediaBusy)return;
   const references=splitViewportPrompt(text).references;
   if(text.length>12000){setError('This message exceeds 12,000 characters including annotation context. Send a smaller batch; your draft is preserved.');return;}
   for(const {annotation} of references){
    if(!annotation)continue;
    const candidate=queueData?.design?.candidates.find(row=>row.fingerprint===annotation.fingerprint&&row.graph.planId===annotation.planId&&row.graph.version===annotation.version),room=candidate?.graph.rooms.find(row=>row.key===annotation.roomKey);
    if(!annotation.note.trim()){setError(`Add text to Annotation ${annotation.number} or remove it before sending.`);return;}
    if(!room||annotation.intent==='revise'&&queueData?.design?.reference?.stale||annotation.anchorMm.x<room.rect[0]||annotation.anchorMm.x>room.rect[2]||annotation.anchorMm.y<room.rect[1]||annotation.anchorMm.y>room.rect[3]){setError(`Annotation ${annotation.number} refers to an older or unavailable edit target. Review the current plan and reattach it before editing.`);return;}
   }
   if(accountExpired){setError('Your saved workspace is available, but your DATUMM session expired. Refresh your account before submitting new work.');return;}
   if(offlineFixture&&text.trim()!==runtimeConfig?.fixturePrompt){
    setError(desktopPreview?'This is the UI-only offline preview. Start npm run preview:desktop for live Ask/Plan, then reopen /preview. Your prompt is preserved.':'OpenCode is not connected. Connect and verify a model in Settings. Your prompt is preserved; Run offline check only validates storage.');return;
   }
   const preserveDraft=offlineFixture&&text!==prompt;
  // needs_input is authoritative even if the chat transport is closing.
  if(run?.status==='needs_input'&&run.data.agent_question){
   if((run.data.agent_question.questions?.length??1)>1){setError('Answer the question group above, then submit all answers together.');return;}
   try{await replyToQuestion({question_id:run.data.agent_question.id,answer:text.trim()});}
   catch(failure){setError((failure as Error).message);}return;
  }
   if(queueMessage&&!variableSelection&&run){
     const queueEpoch=recoveryEpoch.current;
    const queuedMode=override??mode;
    if(recipe){setError('Legacy recipes cannot be queued. Native approvals must be reviewed separately.');return;}
    const value={prompt:text.trim(),mode:queuedMode,model,reasoningEffort,deviceId:deviceId||run.device_id||null,attachmentIds:sources.map(row=>row.id)};
    const signature=JSON.stringify({taskId:run.id,...value});
    if(queueRetry.current?.signature!==signature)queueRetry.current={signature,id:crypto.randomUUID()};
    setActionBusy(true);setError('');
    try{
     await api(`tasks/${run.id}/queue`,'POST',{id:queueRetry.current.id,...value});
      if(queueEpoch!==recoveryEpoch.current){if(promptDrafts.current[sourceKey]===text)promptDrafts.current[sourceKey]='';return;}
     queueRetry.current=null;setPrompt(current=>current===text?'':current);setSources([]);
      const saved=await api<Run>(`tasks/${run.id}`);if(queueEpoch===recoveryEpoch.current)setRun(saved);
     }catch(failure){if(queueEpoch===recoveryEpoch.current)setError((failure as Error).message+' Your prompt is preserved.');}
    finally{setActionBusy(false);}return;
   }
   if(busy&&!variableSelection)return;
  if((override??mode)==='build'&&(!selectedDevice?.online||revitSessions!==1)){
   setError(!selectedDevice?.online?(devices.some(d=>d.online)?'Select your online Revit device in Connections before building.':'Build needs the DATUMM Revit plugin connected. Follow the setup steps above the message box, or continue in Plan mode. Your prompt is preserved.'):'Enable the DATUMM local bridge in Revit and close its settings panel before building.');return;
  }
   setError('');setConnectionNotice('');if(!run){setRun(null);setRunId('');setDesignVersion(null);setDesignDiff('');}if(!preserveDraft)setPrompt('');
  if(run?.data.agent_design&&(override??mode)==='build'&&!run.data.compiled&&!run.data.operation_id)setBuildSetupOpen(true);
  const epoch=recoveryEpoch.current,submission={text,runStarted:false,sourceKey};pendingSubmission.current=submission;
  const isCurrent=()=>recoveryEpoch.current===epoch&&pendingSubmission.current===submission;

  const signature=JSON.stringify({taskId:run?.id,text,mode:override??mode,model,reasoningEffort,recipe,projectId:newProject,attachmentIds:sources.map(row=>row.id)});
  if(submissionKey.current?.signature!==signature)submissionKey.current={signature,key:crypto.randomUUID()};
  const requestKey=submissionKey.current;
  try{
   if(run&&(override??mode)!==run.mode)await taskCommand({type:'change_mode',mode:override??mode});
   if(!isCurrent())return;
   if(run&&!requestKey.body){
    const saved=await api<Run>(`tasks/${run.id}`);
    if(!isCurrent())return;
    if(saved.status==='queued'||saved.status==='running')throw new Error('This task is running. Queue the next prompt instead.');
    setRun(saved);
    commandExpected.current={taskId:saved.id,taskVersion:saved.taskVersion??0,planVersion:saved.currentPlanRef?.version??0};
   }
   const expected=expectedVersion();
   requestKey.body??={mode:override??mode,model,reasoningEffort,modelContextRequirement:useCurrentModel?'read':'auto',deviceId:deviceId||run?.device_id,recipe,taskId:run?.id,projectId:run?undefined:newProject||undefined,idempotencyKey:requestKey.key,expectedTaskVersion:expected.taskVersion,expectedPlanVersion:expected.planVersion,eventCursor:run?.eventCursor??0,visiblePlan:drawingCurrent&&!drawingError?run?.currentPlanRef:null,acceptedAssumptions:reviewAssumptions,placement:placementTask===run?.id?confirmedPlacement:null};
   requestKey.body.attachmentIds=sources.map(row=>row.id);
   await sendMessage({text},{body:requestKey.body});
  }catch(failure){
    if(!isCurrent())return;
    if(!pendingSubmission.current?.runStarted&&!preserveDraft)setPrompt(text);
    if(!pendingSubmission.current?.runStarted&&!currentRun.current)dropOptimistic(text);
   const known=chatStartFailure(failure);
    setBlockedChat(known?.blockingTask?{id:known.blockingTask.id,message:known.message}:null);
   if(known?.state==='rejected')submissionKey.current=null;
   if(pendingSubmission.current?.runStarted)recoverLiveView(pendingSubmission.current.taskId);
   else setError(known?known.message+' Your prompt is preserved.':failure instanceof Error?failure.message+' Your prompt is preserved; check the saved task before retrying.':'DATUMM could not start this task. Your prompt is preserved; check whether another task is active.');
   pendingSubmission.current=null;
  }

 };

  const queueAction=async(action:'resume'|'remove'|'edit'|'stop',item?:typeof promptQueue[number])=>{
   if(!run||actionBusy)return;
   setActionBusy(true);setError('');
   try{
    if(action==='stop')await api(`tasks/${run.id}/cancel`,'POST',{});
    else if(action==='resume')await api(`tasks/${run.id}/queue/resume`,'POST',{});
    else if(item){await api(`tasks/${run.id}/queue/${item.id}`,'DELETE');if(action==='edit'){setPrompt(item.prompt);setMode(item.mode);setModel(item.model);setReasoningEffort(item.reasoningEffort);}}
    setRun(await api<Run>(`tasks/${run.id}`));
   }catch(failure){setError((failure as Error).message);}finally{setActionBusy(false);}
  };

  const reviewTaskAccess=async()=>{
  if(!run)return;setActionBusy(true);setError('');
  try{
   const review=await api<Omit<AccessReview,'runId'>>(`runs/${run.id}/access?batches=${accessBatches}&margin_mm=${accessMargin}`);
   setAccessReview({...review,runId:run.id});
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const enableTaskAccess=async()=>{
  if(!run||!accessReview||accessReview.runId!==run.id)return;setActionBusy(true);setError('');
  try{
   await api(`runs/${run.id}/access`,'POST',{scope_fingerprint:accessReview.fingerprint,
    batches:accessBatches,margin_mm:accessMargin});
   setRun({...run,status:'queued'});setAccessDialog(false);setAccessReview(null);
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const reviewAlternative=async(candidate:{planId:string;version:number;fingerprint:string})=>{
  if(!run?.data.agent_design)return;
  const epoch=++reviewEpoch.current,taskId=run.id;setActionBusy(true);setDrawingError('');
  try{
   const version=await api<VariableVersion>(`variable/plans/${candidate.planId}/versions/${candidate.version}`);
   if(version.fingerprint!==candidate.fingerprint)throw new Error('This concept changed; reload alternatives.');
   if(epoch!==reviewEpoch.current)return;
   const review=await api<{selectionRevision:number}>(`variable/briefs/${run.data.agent_design.briefId}/alternatives`);
   await api(`variable/briefs/${run.data.agent_design.briefId}/selection`,'POST',{planId:candidate.planId,version:candidate.version,fingerprint:candidate.fingerprint,expectedSelectionRevision:review.selectionRevision});
   if(epoch!==reviewEpoch.current)return;
   const refreshed=await api<Run>('tasks/'+taskId);
   if(epoch!==reviewEpoch.current)return;
   setDesignVersion(version);setDrawingStyle('presentation');setDesignDiff('');setCompareVersion(null);setRun(refreshed);
  }catch(e){if(epoch===reviewEpoch.current)setDrawingError((e as Error).message);}finally{if(epoch===reviewEpoch.current)setActionBusy(false);}
 };
 const compareDrawing=async()=>{
  if(!designVersion||!run?.data.agent_design)return;
  setActionBusy(true);try{
   const other=designVersion.version>1?{planId:designVersion.planId,version:designVersion.version-1}:run.data.agent_design.candidates.find(c=>c.planId!==designVersion.planId);
   if(!other)throw Error('No other saved version is available.');
   const prior=await api<VariableVersion>(`variable/plans/${other.planId}/versions/${other.version}`);
   const query=new URLSearchParams({leftPlanId:prior.planId,leftVersion:String(prior.version),rightPlanId:designVersion.planId,rightVersion:String(designVersion.version)});
   const diff=await api<{changedRooms:{key:string}[];siteChanged:boolean}>(`variable/diff?${query}`);
   setCompareVersion(prior);setDesignDiff(`${diff.changedRooms.length} rooms changed${diff.siteChanged?' · footprint/entry changed':''}.`);
  }catch(e){setDrawingError((e as Error).message);}finally{setActionBusy(false);}
 };
 const acceptDrawing=async()=>{
  if(!drawingCurrent||drawingError||!run?.currentPlanRef||!designVersion)return;
  setActionBusy(true);try{
   const binding=await bindCurrentVariable();
   await taskCommand({type:'accept_plan',plan:{schemaVersion:2,source:'variable',briefId:binding.briefId,planId:binding.planId,version:binding.version,fingerprint:binding.fingerprint},acceptedAssumptions:reviewAssumptions});
   if(mode==='build'&&run.mode!=='build')await taskCommand({type:'change_mode',mode:'build'});
   setRun(await api<Run>('tasks/'+run.id));
   if(mode==='build'){setBuildSetupOpen(true);await reviewPlacement();}
  }catch(e){setDrawingError((e as Error).message);}finally{setActionBusy(false);}
 };
 const switchDrawingToBuild=async()=>{if(!drawingCurrent||drawingError||drawingLoading)return;setActionBusy(true);try{await taskCommand({type:'change_mode',mode:'build'});setMode('build');setRun(await api<Run>('tasks/'+run!.id));setBuildSetupOpen(true);if(planAccepted)await reviewPlacement();}catch(e){setDrawingError((e as Error).message);}finally{setActionBusy(false);}};
 const bindCurrentVariable=async():Promise<VariableBinding>=>{
   if(!run?.data.agent_design)throw new Error('Open a concept first.');
   const design=run.data.agent_design;
   const candidate=selectedDesignCandidate;
   if(!candidate)throw new Error('The selected concept version is unavailable. Reload the concept and review it again.');
   const review=await api<{selectionRevision:number}>(`variable/briefs/${design.briefId}/alternatives`);
   const choice=await api<{selectionRevision:number;selected:{planId:string;version:number;fingerprint:string}}>(`variable/briefs/${design.briefId}/selection`,'POST',{
    planId:candidate.planId,version:candidate.version,fingerprint:candidate.fingerprint,expectedSelectionRevision:review.selectionRevision});
   if(choice.selected.planId!==candidate.planId||choice.selected.version!==candidate.version||choice.selected.fingerprint!==candidate.fingerprint)throw new Error('Plan selection changed; review it again.');
   return {briefId:design.briefId,planId:candidate.planId,version:candidate.version,
    fingerprint:candidate.fingerprint,selectionRevision:choice.selectionRevision};
 };
 const buildVariable=async(placement=confirmedPlacement)=>{
  if(!run?.data.agent_design)return;
  setActionBusy(true);setError('');
  try{
   const binding=await bindCurrentVariable();
   if(!planAccepted||run.mode!=='build')throw Error('Accept this exact plan and switch to Build first.');
   if(placementTask!==run.id||!placement)throw Error('Review and confirm native placement first.');
   await taskCommand({type:'prepare_build',deviceId:deviceId||run.device_id,selectionRevision:binding.selectionRevision,placement});
   setRun(await api<Run>('tasks/'+run.id));
   setBuildSetupOpen(false);
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const reviewPlacement=async()=>{
  if(!run)return;
  const device=deviceId||run.device_id;
  if(!device){setError('Revit is not connected. Open Revit, connect the DATUMM plugin, then choose the placement again.');return;}
  setActionBusy(true);setError('');setConfirmedPlacement(null);
  try{const context=await api<PlacementContext>(`tasks/${run.id}/build-context?deviceId=${encodeURIComponent(device)}`);setPlacementContext(context);setPlacementTask(run.id);setPlacementView('');}
  catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const confirmPlacement=async()=>{
  const view=placementContext?.plans.find(v=>v.id===placementView);
  if(!placementContext||!view||[placementX,placementY,placementRotation].some(v=>!v.trim()||!Number.isFinite(Number(v)))){setError('Choose the native plan view and enter origin X/Y in mm and rotation explicitly.');return;}
  const x=Number(placementX),y=Number(placementY),rotation=Number(placementRotation);
  if(Math.abs(x)>900000||Math.abs(y)>900000||rotation<0||rotation>=360){setError('Origin must be within 900,000 mm; rotation must be 0 to less than 360 degrees.');return;}
  const placement:NativePlacement={schemaVersion:2,sessionId:placementContext.sessionId,documentId:placementContext.documentId,revision:placementContext.revision,levelId:view.levelId,viewId:view.id,originXmm:x,originYmm:y,rotationDegrees:rotation};
  setConfirmedPlacement(placement);setError('');await buildVariable(placement);
 };
 const buildLegacy=async()=>{
  if(!run?.currentPlanRef||run.currentPlanRef.source==='variable')return;
  setActionBusy(true);setError('');
  try{
   await taskCommand({type:'accept_plan',plan:run.currentPlanRef});
   await taskCommand({type:'change_mode',mode:'build'});setMode('build');
   await taskCommand({type:'prepare_build',deviceId:deviceId||run.device_id});
   setRun(await api<Run>('tasks/'+run.id));
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const grantVariable=async()=>{
  if(!selectedDevice?.online||revitSessions!==1)return;
  setActionBusy(true);setError('');
  try{
   const binding=await bindCurrentVariable();
   await api(`devices/${selectedDevice.id}/agent-control`,'POST',{...binding,maxBuilds:1});
   await refresh();
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const revokeVariableGrant=async()=>{
  if(!selectedDevice)return;
  setActionBusy(true);setError('');
  try{await api(`devices/${selectedDevice.id}/agent-control`,'DELETE');await refresh();}
  catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };


 const closeMobileNav=()=>{if(window.matchMedia('(max-width:850px)').matches)setLeft(false);};
 const newTask=(projectId='')=>{if(mediaBusy)return;setStudioView('workspace');setTab('preview');setRight(false);setPlanningGoalOpen(false);setNewProject(projectId);promptDrafts.current[sourceKey]=pendingSubmission.current&&!pendingSubmission.current.runStarted?pendingSubmission.current.text:prompt;recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setActionBusy(false);setCompareVersion(null);setDrawingError('');const url=new URL(window.location.href);url.searchParams.delete('task');window.history.replaceState(null,'',url);pendingSubmission.current=null;void stop();submissionKey.current=null;commandRetry.current.clear();setRun(null);setRunId('');setMessages([]);setDesignVersion(null);setDesignDiff('');setError('');setPrompt(promptDrafts.current[projectId?'new:'+projectId:'new']??'');setUseCurrentModel(false);closeMobileNav();};

 const selectRun=(value:Run)=>{if(mediaBusy)return;setStudioView('workspace');setTab('preview');setRight(false);setPlanningGoalOpen(false);promptDrafts.current[sourceKey]=pendingSubmission.current&&!pendingSubmission.current.runStarted?pendingSubmission.current.text:prompt;setPrompt(promptDrafts.current[value.id]??'');recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setActionBusy(false);setCompareVersion(null);setDrawingError('');pendingSubmission.current=null;submissionKey.current=null;void stop();commandRetry.current.clear();setRun(value);setRunId(value.id);setMode(value.mode);setModel(value.model);setReasoningEffort(value.reasoningEffort??'high');setUseCurrentModel((value.data as Run['data']&{model_context_requirement?:string}).model_context_requirement==='read');setDesignVersion(null);setDesignDiff('');setMessages([]);closeMobileNav();};
  const selectRunRef=useRef(selectRun);selectRunRef.current=selectRun;
  useEffect(()=>window.desktop?.onNavigateTask(id=>{const epoch=++recoveryEpoch.current;void api<Run>('tasks/'+id).then(value=>{if(epoch===recoveryEpoch.current)selectRunRef.current(value);}).catch(e=>{if(epoch===recoveryEpoch.current)setError((e as Error).message);});}),[]);

 const act=async(action:string)=>{if(!run)return;setActionBusy(true);setError('');try{
   if(action==='resume'||action==='refresh-proposal'){
    const proposal=run.data.proposal;if(!proposal)throw new Error('Reload the exact native proposal.');
    await taskCommand({type:action==='resume'?'approve_exact_proposal':'refresh_exact_proposal',proposalId:proposal.proposalId,approvalHash:proposal.approvalHash,documentId:proposal.documentId,revision:proposal.revision});
   }else if(['pause','continue','cancel'].includes(action))await taskCommand({type:action});
   else await api('runs/'+run.id+'/'+action,'POST');
   const value=await api<Run>('runs/'+run.id);setRun(value);await refresh();
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};

 const pair=async()=>{setError('');try{const result=await api<{code:string}>('pairing','POST');setPairing(result.code);}catch(e){setError((e as Error).message);}};

 const revoke=async(id:string)=>{try{await api('devices/'+id,'DELETE');if(deviceId===id)setDeviceId('');await refresh();}catch(e){setError((e as Error).message);}};

 const setControl=async(device:Device)=>{setActionBusy(true);setError('');try{await api('devices/'+device.id+'/control',device.fullControl?'DELETE':'POST');await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};

 const organizeDone=async(item:Run)=>{try{const saved=await api<Run>(`tasks/${item.id}/history/done`,item.data.organized_done?'DELETE':'POST',{expectedTaskVersion:item.taskVersion});if(runId===item.id)setRun(saved);await refresh();}catch(e){setError((e as Error).message);}};
 // A feature counts as unsupported (until reload) only when its own route answers 404/405; any other failure is an error.
 const guarded=async(feature:string,route:RegExp,action:()=>Promise<unknown>,waitForRefresh=true)=>{setActionBusy(true);setError('');try{await action();if(waitForRefresh)await refresh();else void refresh();return true;}catch(failure){if(notSupported(failure)&&route.test((failure as {path?:string}).path??''))setChatMenuUnsupported(previous=>previous.includes(feature)?previous:[...previous,feature]);else setError((failure as Error).message);return false;}finally{setActionBusy(false);}};
 const renameChat=async(item:Run,title:string)=>{
  const set=(value:string)=>{setRuns(list=>list.map(row=>row.id===item.id?{...row,title:value}:row));const open=currentRun.current;if(open?.id===item.id)setRun({...open,title:value});};
  set(title.trim());
  const ok=await guarded('rename',/^tasks[/][^/]+[/]title$/,async()=>{await api(`tasks/${item.id}/title`,'POST',{title:title.trim(),expectedTaskVersion:item.taskVersion});void api<Run>('tasks/'+item.id).then(saved=>{if(currentRun.current?.id===saved.id)setRun(saved);}).catch(()=>{});},false);
  if(!ok)set(item.title);
  return ok;
 };
 const moveChat=(item:Run,projectId:string|null)=>guarded('move',/^tasks[/][^/]+[/]project$/,async()=>{await api(`tasks/${item.id}/project`,'POST',{projectId,expectedTaskVersion:item.taskVersion});if(runId===item.id)setRun(await api<Run>('tasks/'+item.id));});
 const createProject=(title:string)=>guarded('projects',/^projects([/]|$)/,()=>api('projects','POST',{title:title.trim()}));
 const archiveProject=(project:ProjectRow)=>guarded('projects',/^projects([/]|$)/,()=>api(`projects/${project.id}/history/archive`,project.archived_at?'DELETE':'POST',{expectedRevision:project.revision??1}));
 const updateHistory=async(item:Run,action:'pin'|'unpin'|'archive'|'unarchive')=>{setActionBusy(true);setError('');try{await api(`tasks/${item.id}/history/${action.includes('pin')?'pin':'archive'}`,action==='pin'||action==='archive'?'POST':'DELETE',{expectedTaskVersion:item.taskVersion});if(runId===item.id)setRun(await api<Run>('tasks/'+item.id));await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};
 const removeTask=async()=>{if(!deleteTarget)return;setActionBusy(true);setError('');try{await api(`tasks/${deleteTarget.id}/history/delete`,'DELETE',{expectedTaskVersion:deleteTarget.taskVersion});if(runId===deleteTarget.id)newTask();setDeleteTarget(null);await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};
 const removeAllTasks=async()=>{if(deletePhrase!=='DELETE')return;setActionBusy(true);setError('');try{await api<{deleted:number}>('runs','DELETE');newTask();setDeleteAllOpen(false);setDeletePhrase('');await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};

 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.key.toLowerCase()==='n'&&!mediaBusy&&!actionBusy){event.preventDefault();newTask();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const messageError=error;
 const contextTitle=typeof nativeContext?.context.title==='string'?nativeContext.context.title:run?.data.context?.title??(selectedDevice?.online?'Revit connected':'Your model, in context');
 const contextView=typeof nativeContext?.context.activeViewName==='string'?nativeContext.context.activeViewName:run?.data.context?.activeViewName??(selectedDevice?.online?'Inspect to read the active view and level.':'Connect Revit to bring your project into the conversation.');

 const toggleLeft=()=>{if(!left&&window.matchMedia('(max-width:850px)').matches)setRight(false);setLeft(value=>!value);};
 const toggleRight=()=>{if(!right&&window.matchMedia('(max-width:850px)').matches)setLeft(false);setRight(value=>!value);};
 const hasContent=messages.length>0||Boolean(run);

 const unreadIds=new Set(runs.filter(item=>isUnread(item,seen,runId)).map(item=>item.id));
 const filteredChats=runs.filter(item=>(!workflowFilter||workflowState(item).kind===workflowFilter&&!item.data.organized_done)&&item.title.toLowerCase().includes(search.toLowerCase()));
 const defaultProject=projects.find(project=>project.isDefault);
 const currentProject=projects.find(project=>project.id===(run?.projectId||newProject)&&!project.isDefault);
 const orderedProjects=projects.filter(project=>!project.isDefault).sort((a,b)=>(projectOrder.includes(a.id)?projectOrder.indexOf(a.id):projectOrder.length)-(projectOrder.includes(b.id)?projectOrder.indexOf(b.id):projectOrder.length));
 const reviewScroll=useRef<StickToBottomContext|null>(null);
 const focusReview=(selector:string)=>reviewFocus(selector,{hasRenderablePlan,setStudioView,setRight,setTab,reviewScroll});
 const continueDesignBuild=async()=>{
  if(!run)return;setActionBusy(true);setError('');
  try{if(queueData?.design?.selected||queueData?.native_build){if(run.mode!=='build'&&!queueData?.native_build){await taskCommand({type:'change_mode',mode:'build'});setRun(await api<Run>('tasks/'+run.id));}setMode('build');}setRight(true);setTab('preview');focusReview(queueData?.native_build?'[aria-label="Native build review"]':queueData?.design?.selected?'[aria-label="Accepted design placement"]':'[aria-label="Validated design preview"]');}
  catch(error){setError((error as Error).message);throw error;}finally{setActionBusy(false);}
 };
 const designDraftKey=run&&queueData?.design?run.id+':'+queueData.design.brief.briefId:'';
  const askFromCanvas=(text:string)=>{setPrompt(previous=>appendViewportPrompt(previous,text));setRight(true);setTab('assistant');requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus());};
 const nativeAction=async(action:'approve'|'reconcile'|'show'|'select')=>{
       if(!run||!queueData?.native_build)return;setActionBusy(true);
       try{if(!window.desktop)throw new Error('Open the desktop to approve native operations.');const row=queueData.native_build;const result=await window.desktop.nativeBuildAction(run.id,action,{expectedTaskVersion:run.taskVersion,proposal:{proposalId:row.proposal.proposalId,approvalHash:row.proposal.approvalHash,documentId:row.changes.documentId,expectedRevision:row.changes.expectedRevision}});setRun(result as Run);}catch(error){try{setRun(await api<Run>(`tasks/${run.id}`));}catch{}throw error;}finally{setActionBusy(false);}
      };
 const designTurn=run?.data.designConversationIndex??savedTurns.findLast(turn=>turn.result?.design?.brief?.version===queueData?.design?.brief.version)?.conversationIndex??0;
 const nativeTurn=run?.data.nativeBuildConversationIndex??designTurn;
  const visiblePrompt=splitViewportPrompt(prompt);
 const workflowNoticeKey=JSON.stringify([run?.id,run?workflowState(run).label:'',run?.currentPlanRef?.fingerprint,queueData?.native_build?.state,queueData?.native_build?.proposal?.proposalId,buildStep]);
  useEffect(()=>{if(hasRenderablePlan){setRight(true);setTab('assistant');}},[hasRenderablePlan,runId]);
  const selectedActivityRun=runs.find(item=>item.id===activitySelection)??run??runs[0];
  const activityRun=selectedActivityRun?.id===run?.id?run:selectedActivityRun;
  const activityRuns=runs.filter(item=>activityFilter==='all'||(activityFilter==='done'?item.status==='completed':workflowState(item).kind===activityFilter));
  const activityView=activityRun?latestTaskActivity(activityRun,activityRun.id===run?.id?events:activityRun.events):null;
  const currentActivity=run?latestTaskActivity(run,events):null;
  const showDesktopAssistant=hasRenderablePlan||studioView!=='workspace'||tab==='tools'||tab==='exports';
 return {projectsSupported,chatMenuUnsupported,unreadIds,renameChat,moveChat,createProject,archiveProject,projects,runId,mediaBusy,actionBusy,selectRun,dialogTrigger,updateHistory,setProjectContextOpen,setDeleteTarget,left,viewportReady,setLeft,panelWidths,resizePanel,toggleLeft,newTask,search,setSearch,studioView,setStudioView,runs,historyView,filteredChats,desktopAvailable,orderedProjects,collapsedProjects,setCollapsedProjects,setRenameTitle,setRenameTarget,setProjectOrder,setWorkflowFilter,workflowFilter,defaultProject,changeSettingsOpen,authConfigured,setDeviceDialog,setHistoryView,setDeletePhrase,setDeleteAllOpen,liveRuntime,desktopPreview,queueData,run,designDraftKey,placementDrafts,selectedSource,executing,setDesignHighlights,selectedDesignElement,setInspectedDesignFingerprint,setRight,setTab,model,askFromCanvas,setActionBusy,setRun,setPrompt,refresh,mode,continueDesignBuild,devices,setMode,focusReview,nativeAction,hasContent,reviewScroll,messages,traceTurns,nativeQuestions,savedTurns,nativeTodos,designTurn,nativeTurn,responseSummary,planningGoalOpen,recoveryEpoch,busy,savedSources,setSelectedSourceId,nativeContext,nativeContextError,commandExpected,taskCommand,proposalExpired,committedBuild,act,setAccessBatches,plannedAccessBatches,setAccessMargin,setAccessReview,setAccessDialog,setError,replyToQuestion,outcome,openCanvas,selectedDevice,buildLegacy,reviewAlternative,drawingLoading,drawingError,drawingMissing,setDrawingRetry,designVersion,drawingCurrent,compareVersion,canvasInputEnabled,persistentProperties,setDrawingStyle,compareDrawing,setCompareVersion,drawingStyle,designDiff,reviewAssumptions,planAccepted,acceptDrawing,switchDrawingToBuild,buildStep,revitSessions,placementTask,confirmedPlacement,buildVariable,setBuildSetupOpen,reviewPlacement,revokeVariableGrant,grantVariable,previewSvg,previewRooms,batchInProgress,partialGoal,verifiedBatchCount,verifiedCount,verifiedBreakdown,completedGoal,completedCriteria,checkpointFindings,submit,verifiedNativeBatches,confirmedAnnotationFailure,canRefreshFailedPreparation,canEndFailedPreparation,connected,workspaceReady,offlineFixture,dismissedWorkflow,workflowNoticeKey,setDismissedWorkflow,promptQueue,prompt,queueAction,runtimeConfig,messageError,blockedChat,setBlockedChat,connectionNotice,setConnectionNotice,useCurrentModel,setUseCurrentModel,draftReferences,commandsOpen,commandMatches,commandIndex,chooseCommand,visiblePrompt,setCommandIndex,setCommandsDismissed,sendShortcut,sourceKey,sources,setSources,setMediaBusy,buildUnavailable,chatModels,reasoningEffort,modelPreferenceInitialized,setModel,setReasoningEffort,queueMessage,providerStatus,contextView,right,tab,hasRenderablePlan,activeDrawing,setSelectedDesignElement,plannedCandidate,separateNativeFollowup,contextTitle,previewLabel,previewCounts,currentActivity,eventDetail,exportItems,mcpToolsError,mcpTools,setSendShortcut,setCanvasInputEnabled,setPersistentProperties,needsAccountAdmission,accountStatus,accountStatusError,accountActionError,accountBusy,accountWorkspaceLoading,accountAction,settingsOpen,showDesktopAssistant,toggleRight,currentProject,deviceId,accountExpired,renameTarget,renameTitle,error,accessDialog,restoreDialogFocus,accessBatches,accessMargin,reviewTaskAccess,accessReview,enableTaskAccess,buildSetupOpen,placementContext,placementView,setPlacementView,setConfirmedPlacement,placementX,setPlacementX,placementY,setPlacementY,placementRotation,setPlacementRotation,confirmPlacement,activityView,activityFilter,setActivityFilter,activityRuns,activityRun,setActivitySelection,designHighlights,deviceDialog,setDeviceId,revoke,setControl,deleteTarget,removeTask,deleteAllOpen,deletePhrase,removeAllTasks,canvasOpen,setCanvasOpen,canvasTrigger,models,projectContextOpen,localConnections,setLocalConnections};
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
