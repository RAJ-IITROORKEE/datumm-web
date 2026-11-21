import {nativeBatchProgress} from '@/lib/conversation-result.mjs';
import {roomAreaSchedule} from '@/lib/plan-geometry.mjs';
import {isRenderablePlan,reviewFocus,openWorkspaceView,readWorkspaceLayout,effectiveWorkspaceLayout,workspaceScene,DEFAULT_WORKSPACE_LAYOUT,storedWorkspaceLayout,resizeWorkspaceLayout} from '@/lib/workspace-layout.mjs';
import type { AlternativeSelection, WorkAreaSection, WorkScope } from '@/lib/work-area-contract';
import {useState, useRef, useEffect, useCallback, useMemo, type SetStateAction} from 'react';
import {createPromptDraftStore, type PromptDraftStore, type PromptDraftStatus} from '@/lib/prompt-drafts.mjs';
import {readSelectionMarker,claimSelectionMarker,releaseSelectionMarker} from '@/lib/selection-uncertainty.mjs';
import {type AuthStatus, type ProviderStatus} from '@/lib/desktop-contract';
import {accountAdmissionState} from '../account-admission';
import {type ReasoningEffort} from '../model-picker';
import {hasPendingQuestion,workflowState} from '@/lib/workflow-state';
import {type DesignPlacementDraft, type DesignRecord, candidateDrawing} from '../design-review';
import {acceptsTaskSnapshot, displayEvent, emptyProjection, reduceProjection, type TaskEvent} from '@/lib/task-projection';
import {type OpenCodeQuestion} from '../opencode-questions';
import {activityTurns, latestTaskActivity, type RunManifest} from '../agent-activity';
import {type SavedTurn} from '../saved-turn-result';
import {type ComposerSource} from '../composer-media';
import {applyAppearance, readAppearance} from '@/lib/appearance';
import {replaceTerminalCommand} from '@/lib/task-command';
import {savedTaskConnectionNotice, chatStartFailure, admissionMessage, serviceErrorMessage} from '@/lib/chat-start';
import {planBuildStep} from '@/lib/plan-build-flow';
import {FileJson, LayoutTemplate, FileSpreadsheet, Download} from 'lucide-react';
import {AguiChatTransport} from '@/lib/agui-chat-transport';
import {useChat} from '@ai-sdk/react';
import {settledPoll,openChatPollMs,listPollMs} from '@/lib/settled-poll.mjs';
import {chooseDevice} from '@/lib/device-choice.mjs';
import {projectsStatus,type ProjectsStatus} from '@/lib/projects-status.mjs';
import {stopRequested} from '@/lib/stop-requested.mjs';
import {featureEnabled,parseCapabilities} from '@/lib/capabilities.mjs';
import {usePlanEdit} from './use-plan-edit';
import {editablePlan} from '@/lib/plan-edits.mjs';
import {usePromptQueue} from './use-prompt-queue';
import {queueAllowed} from '@/lib/prompt-queue.mjs';
import {alternateModel,retryableFailure} from '@/lib/model-retry.mjs';
import {buildFrontendContext} from '@/lib/agui/frontend-context.mjs';
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

type RuntimeConfig={models:string[];modelInfo?:unknown;defaultModel?:string;defaultReasoningEffort?:ReasoningEffort;agentEnabled?:boolean;runtime?:string;fixturePrompt?:string;supportedExports?:string[];nativeAvailable?:boolean;nativeReadAvailable?:boolean;authenticationRequired?:boolean};

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

export type Run={created_at?:string;projectId?:string;acceptance?:{plan:{planId:string;version:number;fingerprint:string};acceptedAssumptions:string[]}|null;id:string;taskVersion?:number;eventCursor?:number;executionId?:string;currentPlanRef?:{schemaVersion:2;source:'variable'|'legacy_plan'|'legacy_draft';briefId:string;planId:string;version:number;fingerprint:string}|null;conversation?:{prompt?:string;answer?:string;turnId?:string;presentation?:unknown;completion?:unknown;projectCitations?:unknown;recordedOutcome?:{schemaVersion:1;taskId:string;turnId:string;executionId:string;status:'needs_connection'};attachmentIds?:string[];nativeMessages?:{id:string;text:string;finish:string|null}[]}[];title:string;mode:Mode;model:string;ownerId?:string;reasoningEffort?:ReasoningEffort;status:string;modelOutcome?:{state:'no_write'|'pending'|'unknown'|'committed_unverified'|'committed_verified'|'rolled_back'|'failed';verified:boolean;present:number|null;missing:number|null;warnings:number|null;deleted?:number|null;verifiedBatches?:number;expectedBatches?:number;completedBuild?:boolean};device_id:string;pinned_at?:string;archived_at?:string;events:RunEvent[];data:{native_messages?:{id:string;text:string;finish:string|null}[];planning_goal?:PlanningGoal;designConversationIndex?:number;nativeBuildConversationIndex?:number;organized_done?:boolean;run_manifest?:RunManifest;project_context_shared?:boolean;agent_coverage?:ModelCoverage;agent_advice?:AdviceFinding[];agent_research?:RegulationResearch[];build_comparison?:BuildComparison;build_feedback?:BuildFeedback[];build_revision_count?:number;m09_revision?:{goalVersion:number};build_comparison_error?:string;annotation_view_review?:{viewId:string;name:string;reason:string};native_batches?:{verified:boolean;compiled:{counts:Record<string,number>};receipt:{state:string;elementIds:string[]}}[];build_type_review?:{requiredSizes:Record<string,unknown>[];loadedChoices:Record<string,unknown>[];resolution:string;revision:number};agent_scheduler?:SchedulerView|null;agent_specialists?:SpecialistResult[];agent_interpreted_brief?:InterpretedBrief;usage?:ContextUsageData;model_context_requirement?:'none'|'read'|'write';failure?:{schemaVersion:1;code:string;recoveryAction:string};agent_memory?:TaskMemory;agent_context?:ContextMetrics;agent_limit?:{reason:string;continuationAvailable:boolean};agent_quantity_pages?:{documentId:string;revision:number;scope:string;categories:string[];coverage:string;groups:unknown[]}[];agent_native_image?:{documentId:string;revision:number;viewName:string;width:number;height:number;provenance:string};agent_element_pages?:{scope:{categories:string[]};coverage:{status:string;returnedCount:number;totalCount:number};aggregates:{inspectedStraightWallProjectedLengthM:number};limitations:string[]}[];task_access?:{revoked:boolean;remaining:number;expiresAt:string};agent_execution?:boolean;agent_draft?:DraftTask;draft_task?:DraftTask;agent_question?:AgentQuestion;agent_reply_receipt?:{questionId:string;version:number};agent_task_plan?:{turnId?:string;version:number;goal:string;successCriteria:string[];steps:{key:string;title:string;action:string;expectedResult:string;targetCategories?:string[];required?:boolean}[];progress:{key:string;status:string}[]};variable_selection?:{version:number};operation_id?:string;recovery?:{data?:{state?:string;sameDocument?:boolean;elements?:{missing?:boolean}[]|null}};concept?:ConceptImage;concept_error?:string;plan?:{version:number;fingerprint:string;brief:{bedrooms:number;bathrooms:number;entrance:string;site_width_mm:number;site_depth_mm:number;wall_height_mm:number}};agent_design?:{briefId:string;brief:{site:{widthMm:number;depthMm:number;entry:string};requirements:{key:string;kind:string}[]};candidates:{planId:string;version:number;fingerprint:string;score:number;checks?:unknown}[];recommended?:unknown;assumptions:string[];diagnostics:string[];previewSvg:string;previewRooms:{name:string;expectedAreaM2:number}[];conceptImage?:ConceptImage};agent_inspection?:{documentId:string;revision:number;counts:Record<string,number>;rooms:{name:string;areaM2:number}[];coverage:{category:string;status:string;returnedCount:number;totalCount:number|null}[];limitations:string[]};agent_postbuild_inventory?:{documentId:string;revision:number;counts:Record<string,number>};agent_result?:{status:string;answer?:string;question?:string;goal?:string;documentId?:string;operationId?:string;verification?:string;criteria?:string[];assessment?:DraftAssessment;batchHistory?:NativeBatch[];changes?:Record<string,number>};selected_plan?:{version:number};snapshot?:{svg:string;revision:number;provenance:string};inventory?:{counts:Record<string,number>;rooms:{name:string;areaM2:number}[]};answer?:string;error?:string;context?:{title:string;activeViewName:string;documentId:string};compiled?:{svg?:string;changes?:{levelId:string;units:string;coordinateFrame:string;operations:({key:string;kind:string}&Record<string,unknown>)[]};counts:Record<string,number>;areas:{name:string;expectedAreaM2:number}[]};proposal?:{proposalId:string;expiresAt:string;documentId:string;approvalHash:string;revision:number;deletions?:{key:string;targetId:string;elements:{id:string;kind:string;name:string}[]}[]};receipt?:{state:string};verification?:{receipt?:{elementIds?:string[];warnings?:string[]};elements?:unknown[]}}};

export function taskStepCompleted(run:Run,step:NonNullable<Run['data']['agent_task_plan']>['steps'][number]):boolean{
 return run.data.agent_task_plan?.progress.some(row=>row.key===step.key&&row.status==='completed')??false;
}

export const terminal=new Set(['completed','needs_input','failed','cancelled','awaiting_approval','interrupted','paused_limit','paused_recovery','reconciling']);
const checkpointStages=new Set(['plan_ready','specialist_complete','specialist_completed']);
type TaskObservation={taskId:string;requestId:string;epoch:number;sequence:number;lastProgressAt:number;checkpoint:number;final:boolean};
type SelectedTaskRead={
 route?:'runs'|'tasks';
 readBase?:Run|null;
 followUp?:(value:Run|null)=>boolean;
};

export const completedDraftTitle=(title:string)=>title.replace(/^Dry-run:\s*/i,'').replace(/\s*[—–-]\s*Plan only\s*$/i,'');

export const reviewCriteria=(criteria:string[])=>criteria.filter(item=>!(/\bPlan(?: and preview)? only\b|\bno native transaction\b|\bno model change is authorized\b/i.test(item)));

export type ProjectRow={id:string;title:string;chatCount?:number;revision?:number;isDefault?:boolean;archived_at?:string};
/** The hosted backend may not have a route yet: the feature hides instead of showing an error. */
export const notSupported=(failure:unknown)=>[404,405].includes((failure as {status?:number})?.status??0);
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{

 const response=await fetch('/api/service/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});

 const raw=await response.text();let data:unknown;
 try{data=JSON.parse(raw);}catch{data={detail:raw};}
 if(!response.ok){
  const detail=data&&typeof data==='object'&&'detail' in data?data.detail:data;
   const failure=new Error(serviceErrorMessage(typeof detail==='string'?detail:detail&&typeof detail==='object'&&'message' in detail&&typeof detail.message==='string'?detail.message:detail&&typeof detail==='object'&&'error' in detail&&typeof detail.error==='string'?detail.error:'',response.status,response.headers.get('content-type')??''));
  Object.assign(failure,{status:response.status,path,serviceCode:detail&&typeof detail==='object'&&'code' in detail?detail.code:undefined});throw failure;
 }
 return data as T;

}

export function useWorkspaceState({authConfigured,accountKey,desktopPreview=false}:{authConfigured:boolean;accountKey?:string;desktopPreview?:boolean}){

 const [desktopAvailable,setDesktopAvailable]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
 const [settingsTarget,setSettingsTarget]=useState<{id:string;revision:number}|undefined>(undefined);
 const [accountStatus,setAccountStatus]=useState<AuthStatus>(),[accountStatusError,setAccountStatusError]=useState(''),[accountActionError,setAccountActionError]=useState(''),[accountBusy,setAccountBusy]=useState(false),[accountWorkspaceSubject,setAccountWorkspaceSubject]=useState<string>();
 const accountEpoch=useRef(0);
 const [sendShortcut,setSendShortcut]=useState('enter'),[canvasInputEnabled,setCanvasInputEnabled]=useState(false),[persistentProperties,setPersistentProperties]=useState(false);
 useEffect(()=>{try{setSendShortcut(localStorage.getItem('datumm-send-shortcut')==='ctrl-enter'?'ctrl-enter':'enter');localStorage.removeItem('datumm-canvas-input');localStorage.removeItem('datumm-persistent-properties');}catch{}},[]);
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

 const [mode,setMode]=useState<Mode>('plan'),[prompt,setPromptValue]=useState(''),[model,setModel]=useState('openai/gpt-6-luna'),[reasoningEffort,setReasoningEffort]=useState<ReasoningEffort>('high');
 const promptValue=useRef(''),promptDrafts=useRef<PromptDraftStore>(createPromptDraftStore());
 const draftOwner=useRef<{account:string|null|undefined;source:string}>({account:undefined,source:'new'});
 const [draftSaveStatus,setDraftSaveStatus]=useState<PromptDraftStatus>('memory');
 const displayPrompt=useCallback((text:string)=>{promptValue.current=text;setPromptValue(text);},[]);
 const setPrompt=useCallback((value:SetStateAction<string>)=>{
  const text=typeof value==='function'?value(promptValue.current):value;
  setDraftSaveStatus(promptDrafts.current.set(draftOwner.current.source,text));
  displayPrompt(text);
 },[displayPrompt]);
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
  const capabilities=useMemo(()=>parseCapabilities(runtimeConfig),[runtimeConfig]);
  const buildUnavailable=desktopPreview||offlineFixture||runtimeConfig?.nativeAvailable===false;
  const [sessionObservation,setSessionObservation]=useState<{generation:number;count:number|null}|null>(null);
  const [nativeContext,setNativeContext]=useState<{sessionId:string;observedAt:string;context:Record<string,unknown>}|null>(null),[nativeContextError,setNativeContextError]=useState('');

 const [runs,setRuns]=useState<Run[]>([]),[runId,setRunId]=useState('');
 const [projectContextOpen,setProjectContextOpen]=useState(false),[projectsTarget,setProjectsTarget]=useState<HTMLDivElement|null>(null);
 const [projects,setProjects]=useState<ProjectRow[]>([]),[projectsState,setProjectsState]=useState<ProjectsStatus>('unknown'),[chatMenuUnsupported,setChatMenuUnsupported]=useState<string[]>([]),[seen,setSeen]=useState<Record<string,number>>({});
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

 const workspaceAccountKey=accountKey??(desktopAvailable?admittedSubject??'desktop-unadmitted':desktopPreview?'development-preview':'development-unconfigured');
 const [planningGoalOpen,setPlanningGoalOpen]=useState(false);
 const reviewEpoch=useRef(0);
 const placementDrafts=useRef(new Map<string,DesignPlacementDraft>());
 const [projectionRecord,setProjectionRecord]=useState(()=>({accountKey:workspaceAccountKey,value:emptyProjection<Run>()}));
 const projection=projectionRecord.value;
 const setProjection=(value:SetStateAction<typeof projection>)=>setProjectionRecord(previous=>({accountKey:workspaceAccountKey,value:typeof value==='function'?value(previous.accountKey===workspaceAccountKey?previous.value:emptyProjection<Run>()):value}));
 const run=projectionRecord.accountKey===workspaceAccountKey&&projection.snapshot?.id===runId?projection.snapshot:null;
 const events=run?projection.events:[];
   const nativeQuestions=(run?.data as {opencode_questions?:OpenCodeQuestion[]}|undefined)?.opencode_questions??[];
   const nativeTodos=(run?.data as {opencode_todos?:{content:string;status:string;priority:string;required?:boolean}[]}|undefined)?.opencode_todos??[];
   const traceTurns=useMemo(()=>activityTurns(events),[events]);
   const savedTurns=(run?.data as {turns?:SavedTurn[]}|undefined)?.turns??[];
   const queueData=run?.data as {prompt_queue?:{id:string;prompt:string;mode:Mode;model:string;reasoningEffort:ReasoningEffort;deviceId:string|null}[];queue_paused?:boolean;native_build?:any;design?:DesignRecord;failure?:{code:string;effectiveOutputTokens:number;reasoningEffort:string}}|undefined;
   const [inspectedDesignFingerprint,setInspectedDesignFingerprint]=useState(''),[designHighlights,setDesignHighlights]=useState<string[]>([]),[selectedDesignElement,setSelectedDesignElement]=useState('');
   const plannedCandidate=queueData?.design?.candidates.find(c=>c.fingerprint===inspectedDesignFingerprint)??queueData?.design?.candidates.find(c=>c.fingerprint===queueData.design?.selected)??queueData?.design?.candidates[0];
   const separateNativeFollowup=Boolean(queueData?.native_build&&!queueData.native_build.design);
   const promptQueue=queueData?.prompt_queue??[];
 const draftReferences=[...(queueData?.design?.feedback??[]),...(queueData?.design?.history??[]).flatMap(row=>row.feedback??[])].filter(row=>prompt.includes(JSON.stringify(row))).slice(-6);
 const currentRun=useRef(run);currentRun.current=run;
 const setRun=(value:Run|null,readBase?:Run|null)=>setProjection(previous=>value?reduceProjection(previous,{snapshot:value,readBase}):emptyProjection<Run>());

 const [error,setError]=useState(''),[connected,setConnected]=useState(false),[serviceError,setServiceError]=useState('');
  const [blockedChat,setBlockedChat]=useState<{id:string;message:string}|null>(null);
 const [connectionNotice,setConnectionNotice]=useState('');
 const [sourceDrafts,setSourceDrafts]=useState<Record<string,ComposerSource[]>>({}),[mediaBusy,setMediaBusy]=useState(false);
 const sourceKey=runId||(newProject?'new:'+newProject:'new'),sources=sourceDrafts[sourceKey]??[];
 const workspaceScopeInput:Omit<WorkScope,'epoch'>={key:JSON.stringify([workspaceAccountKey,runId?'task':'draft',runId||sourceKey]),accountKey:workspaceAccountKey,taskId:runId||null,sourceKey};
 const workspaceGuard=useRef({key:workspaceScopeInput.key,generation:1});
 if(workspaceGuard.current.key!==workspaceScopeInput.key){workspaceGuard.current={key:workspaceScopeInput.key,generation:workspaceGuard.current.generation+1};reviewEpoch.current++;}
 const scopeCurrent=(token:{key:string;generation:number})=>workspaceGuard.current.key===token.key&&workspaceGuard.current.generation===token.generation;
 const [savedSourceRecord,setSavedSourceRecord]=useState<{key:string;generation:number;value:ComposerSource[]}>({key:'',generation:0,value:[]});
 const savedSources=scopeCurrent(savedSourceRecord)?savedSourceRecord.value:[];
 const setSavedSources=(value:ComposerSource[],token=workspaceGuard.current)=>{if(scopeCurrent(token))setSavedSourceRecord({...token,value});};
 const [selectedSourceId,setSelectedSourceId]=useState('');
 const selectedSource=savedSources.find(row=>row.id===selectedSourceId)??savedSources.find(row=>row.image);
 const sourceIds=Array.from(new Set(run?.conversation?.flatMap(turn=>turn.attachmentIds??[])??[])).join(',');
 useEffect(()=>{
  let live=true;const token={...workspaceGuard.current},requestedIds=sourceIds;setSavedSources([],token);setSelectedSourceId('');
  if(window.desktop&&requestedIds)void Promise.all(requestedIds.split(',').map(id=>window.desktop!.previewAttachment(id))).then(values=>{
   if(live&&scopeCurrent(token)&&requestedIds===sourceIds)setSavedSources(values.map(value=>({...value.attachment,image:value.image})),token);
  }).catch(()=>{if(live&&scopeCurrent(token))setConnectionNotice('Some saved source previews are unavailable; task results remain saved.');});
  return()=>{live=false;};
 },[sourceIds,workspaceScopeInput.key]);
 const setSources=(value:ComposerSource[])=>setSourceDrafts(previous=>({...previous,[sourceKey]:value}));
 useEffect(()=>{const update=()=>applyAppearance(readAppearance());update();const system=matchMedia('(prefers-color-scheme: dark)');system.addEventListener('change',update);return()=>system.removeEventListener('change',update);},[]);
 useEffect(()=>{try{for(const name of ['contrast','motion','density','scale']){const value=localStorage.getItem('datumm-'+name);if(value)document.documentElement.dataset[name]=value;}}catch{}},[]);
  const submissionKey=useRef<{signature:string;key:string;body?:Record<string,unknown>}|null>(null);
  const queueRetry=useRef<{signature:string;id:string}|null>(null);
  const modelOverride=useRef<string|null>(null);
 const commandRetry=useRef(new Map<string,{schemaVersion:2;idempotencyKey:string;expectedTaskVersion:number;expectedPlanVersion:number;command:Record<string,unknown>}>());
 const commandExpected=useRef<{taskId:string;taskVersion:number;planVersion:number}|null>(null);
 const expectedVersion=()=>{
  const known=commandExpected.current;
  return known&&run&&known.taskId===run.id&&known.taskVersion>(run.taskVersion??0)?known:{taskId:run?.id??'',taskVersion:run?.taskVersion??0,planVersion:run?.currentPlanRef?.version??0};
 };
 const taskCommand=async(command:Record<string,unknown>)=>{
  if(!run)throw new Error('Open the saved task first.');
  if(!scopeCurrent(actionScope))throw new Error('Task view changed. Review the current task again.');
  if((['accept_plan','prepare_build','approve_exact_proposal'].includes(String(command.type))||(command.type==='change_mode'&&command.mode==='build'))&&selectionBlocked())throw new Error('Check the saved selection before approval or Build.');
  if(cancelPendingRef.current)throw new Error('Stop requested. Wait for the task status before issuing another command.');
   const epoch=recoveryEpoch.current,scope={...workspaceGuard.current};
   const current=()=>epoch===recoveryEpoch.current&&scopeCurrent(scope)&&currentRun.current?.id===run.id;
   if(!current())throw new Error('Task view changed. The original draft is preserved.');
  const signature=JSON.stringify({taskId:run.id,command});
   let request=commandRetry.current.get(signature);
   if(!request){
    if(['change_mode','pause','cancel','continue'].includes(String(command.type))){
     const saved=await api<Run>(`tasks/${run.id}`);if(!current()||saved.id!==run.id)throw new Error('Task view changed. The original draft is preserved.');
     if((saved.taskVersion??0)<(currentRun.current?.taskVersion??0)||(saved.eventCursor??0)<(currentRun.current?.eventCursor??0))throw new Error('The saved task changed while it was being checked. Retry with the latest task.');
     setRun(saved);
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
    if(commandRetry.current.get(signature)===request)commandRetry.current.delete(signature);
    try{
      const saved=await api<Run>('tasks/'+run.id);if(!current()||saved.id!==run.id)throw e;setRun(saved);
     commandExpected.current={taskId:saved.id,taskVersion:saved.taskVersion??0,planVersion:saved.currentPlanRef?.version??0};
    }catch{}
   }
   if(e instanceof Error)e.message=admissionMessage(e.message,(e as Error&{serviceCode?:unknown}).serviceCode);
   throw e;
  }
  if(replaceTerminalCommand(command.type,result.state)&&commandRetry.current.get(signature)===request)commandRetry.current.delete(signature);
  if(result.state!=='applied')throw new Error(admissionMessage(result.error??'The command was accepted and is still being applied. Check the saved task before retrying.'));
   if(current())commandExpected.current={taskId:run.id,taskVersion:result.taskVersion,planVersion:request.expectedPlanVersion};
  if(commandRetry.current.get(signature)===request)commandRetry.current.delete(signature);
  return result;
 };

 const [desktopLeft,setDesktopLeft]=useState(true);
 const [drawerLeft,setDrawerLeft]=useState(false);
 const [navigationNarrow,setNavigationNarrow]=useState(false);
 const left=navigationNarrow?drawerLeft:desktopLeft;
 const setLeft=(value:SetStateAction<boolean>)=>(navigationNarrow?setDrawerLeft:setDesktopLeft)(value);
 const [workAreaState,setWorkAreaState]=useState({key:workspaceScopeInput.key,section:'design' as WorkAreaSection,properties:false});
 const workAreaCurrent=workAreaState.key===workspaceScopeInput.key;
 const workAreaSection=workAreaCurrent?workAreaState.section:'design',propertiesOpen=workAreaCurrent&&workAreaState.properties;
 if(!workAreaCurrent)setWorkAreaState({key:workspaceScopeInput.key,section:'design',properties:false});
 const closeProperties=()=>setWorkAreaState(previous=>({...previous,properties:false}));
 const settingsPreviousLeft=useRef<{desktop:boolean;drawer:boolean}|null>(null);
 const settingsOpener=useRef<HTMLElement|null>(null);
 const settingsFocusTransition=useRef<'open'|'close'|null>(null);
 const changeSettingsOpen=useCallback((open:boolean,section?:string)=>{
  if(open&&section)setSettingsTarget(previous=>({id:section,revision:(previous?.revision??0)+1}));
  if(open){const active=document.activeElement;const menuTrigger=active instanceof HTMLElement&&active.closest('[role="menu"]')?Array.from(document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"][data-state="open"]')).find(element=>element.getClientRects().length>0):null;settingsOpener.current=menuTrigger??(active instanceof HTMLElement&&active!==document.body&&active!==document.documentElement?active:null);}
  settingsFocusTransition.current=open?'open':'close';
  setSettingsOpen(open);
  if(!open&&window.location.hash==='#settings'){const url=new URL(window.location.href);url.hash='';window.history.replaceState(null,'',url);}
 },[]);
 useEffect(()=>{
  const transition=settingsFocusTransition.current;
  if(!transition||(transition==='open')!==settingsOpen)return;
  if(!settingsOpen&&settingsPreviousLeft.current!==null&&left!==(navigationNarrow?settingsPreviousLeft.current.drawer:settingsPreviousLeft.current.desktop))return;
  // Wait for Settings and the restored navigation to commit, after a launching menu closes.
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
   if(settingsFocusTransition.current!==transition)return;
   const opener=settingsOpener.current;
   const target=settingsOpen?document.querySelector<HTMLElement>('.studio-settings-embedded main h1'):opener?.isConnected&&opener.getClientRects().length&&!opener.closest('[hidden],[inert]')?opener:Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Open workspace navigation"],[aria-label="Expand navigation"],[aria-label="Show sidebar"],.desktop-navigation-header .desktop-panel-toggle,[aria-label="DATUMM workspace menu"],[aria-label="Chats"]')).find(element=>element.getClientRects().length>0&&!element.closest('[hidden],[inert]'));
   if(target){target.focus();settingsFocusTransition.current=null;}
  });});
  return()=>cancelAnimationFrame(frame);
 },[settingsOpen,left]);
 useEffect(()=>{
  const open=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.key===','){event.preventDefault();changeSettingsOpen(true);}};
  window.addEventListener('keydown',open);
  return()=>window.removeEventListener('keydown',open);
 },[desktopPreview,changeSettingsOpen]);
 useEffect(()=>{
  if(settingsOpen&&settingsPreviousLeft.current===null){
   settingsPreviousLeft.current={desktop:desktopLeft,drawer:drawerLeft};
   setDesktopLeft(false);setDrawerLeft(false);
  }else if(!settingsOpen&&settingsPreviousLeft.current!==null){
   const previous=settingsPreviousLeft.current;
   setDesktopLeft(previous.desktop);setDrawerLeft(previous.drawer);
   settingsPreviousLeft.current=null;
  }
 },[settingsOpen]);
 useEffect(()=>{

  const sync=()=>changeSettingsOpen(window.location.hash==='#settings');
  sync();window.addEventListener('hashchange',sync);
  return()=>window.removeEventListener('hashchange',sync);
 },[changeSettingsOpen]);
 const [studioView,setStudioView]=useState<'workspace'|'activity'|'schedules'>('workspace');
 const [workspacePane,setWorkspacePane]=useState<'chat'|'drawing'>('chat');
 const [activityFilter,setActivityFilter]=useState('all');
 const [activitySelection,setActivitySelection]=useState('');
 const [viewportReady,setViewportReady]=useState(false);
 const [dismissedWorkflow,setDismissedWorkflow]=useState('');
 const [layout,setLayout]=useState({...DEFAULT_WORKSPACE_LAYOUT});
 const [viewportWidth,setViewportWidth]=useState(1440);
 useEffect(()=>{try{setLayout(readWorkspaceLayout(localStorage));}catch{}const update=()=>setViewportWidth(window.innerWidth);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 const effectiveLayout=effectiveWorkspaceLayout(layout,viewportWidth,left);
 const panelWidths={left:effectiveLayout.navigationWidth,right:effectiveLayout.chatWidth};
 const resizePanel=(side:'left'|'right',width:number)=>setLayout(previous=>{
  const next=resizeWorkspaceLayout(previous,side,width);
  try{localStorage.setItem('datumm-workspace-layout-v2',JSON.stringify(storedWorkspaceLayout(next)));}catch{}return next;
 });
 const selectWorkAreaSection=(section:WorkAreaSection)=>{setWorkAreaState(previous=>({...previous,key:workspaceScopeInput.key,section}));setStudioView(previous=>!runId&&previous!=='workspace'?previous:'workspace');setWorkspacePane('drawing');};
 const openProperties=()=>{setWorkAreaState({key:workspaceScopeInput.key,section:'design',properties:true});setStudioView(previous=>!runId&&previous!=='workspace'?previous:'workspace');setWorkspacePane('drawing');};

 const [deviceDialog,setLegacyDeviceDialog]=useState(false),[pairing,setPairing]=useState(''),[search,setSearch]=useState(''),[actionBusy,setActionBusy]=useState(false);
 const lifecycleAction=useRef<{epoch:number}|null>(null);
 const actionScope={...workspaceGuard.current};
 const [localConnections,setLocalConnections]=useState(false);
 const setDeviceDialog=(open:boolean)=>liveRuntime?setLocalConnections(open):setLegacyDeviceDialog(open);
const [accessDialog,setAccessDialog]=useState(false),[accessBatches,setAccessBatches]=useState(1),[accessMargin,setAccessMargin]=useState(0),[accessReview,setAccessReview]=useState<AccessReview|null>(null);
const [savedPlacementContext,setPlacementContext]=useState<PlacementContext|null>(null),[placementTask,setPlacementTask]=useState('');
const effectivePlacementDevice=deviceId||run?.device_id||'';
const placementDeviceEpoch=useRef({device:effectivePlacementDevice,generation:1});
if(placementDeviceEpoch.current.device!==effectivePlacementDevice)placementDeviceEpoch.current={device:effectivePlacementDevice,generation:placementDeviceEpoch.current.generation+1};
const [placementScope,setPlacementScope]=useState<{key:string;generation:number;device:string;deviceGeneration:number}|null>(null);
const [placementX,setPlacementX]=useState(''),[placementY,setPlacementY]=useState(''),[placementRotation,setPlacementRotation]=useState(''),[placementView,setPlacementView]=useState('');
const [savedConfirmedPlacement,setConfirmedPlacement]=useState<NativePlacement|null>(null);
const placementOwned=Boolean(placementScope&&scopeCurrent(placementScope)&&placementScope.device===effectivePlacementDevice&&placementScope.deviceGeneration===placementDeviceEpoch.current.generation&&placementTask===run?.id);
const placementContext=placementOwned?savedPlacementContext:null,confirmedPlacement=placementOwned?savedConfirmedPlacement:null;
 const [historyView,setHistoryView]=useState<'recent'|'archived'>('recent'),[deleteTarget,setDeleteTarget]=useState<Run|null>(null),[deleteAllOpen,setDeleteAllOpen]=useState(false),[deletePhrase,setDeletePhrase]=useState('');
 const [canvasOpen,setCanvasOpen]=useState(false);
 const [designRecord,setDesignRecord]=useState<{key:string;generation:number;value:VariableVersion|null}>({key:'',generation:0,value:null});
 const designVersion=scopeCurrent(designRecord)?designRecord.value:null;
 const currentDrawing=useRef(designVersion);currentDrawing.current=designVersion;
 const currentDevice=useRef(deviceId||run?.device_id||'');currentDevice.current=deviceId||run?.device_id||'';
 const setDesignVersion=(value:VariableVersion|null,token=workspaceGuard.current)=>{if(scopeCurrent(token))setDesignRecord({...token,value});};
 const [drawingError,setDrawingError]=useState(''),[drawingMissing,setDrawingMissing]=useState(false),[drawingLoading,setDrawingLoading]=useState(false),[drawingRetry,setDrawingRetry]=useState(0);
 const [,setUncertainSelections]=useState<Record<string,{plan:{planId:string;version:number;fingerprint:string};version?:VariableVersion;message:string}>>({});
 const [selectionIssue,setSelectionIssue]=useState<{key:string;message:string}>({key:'',message:''});
 const selectionLocks=useRef(new Map<string,{plan:{planId:string;version:number;fingerprint:string};version?:VariableVersion;message:string}>());
 const [,setSelectionStorageRevision]=useState(0);
 const selectionKey=JSON.stringify([workspaceAccountKey,run?.id,run?.data.agent_design?.briefId]);
 const selectionTask=run?.id,selectionBrief=run?.data.agent_design?.briefId;
 const selectionStorage=()=>{try{return window.localStorage;}catch{return null;}};
 const selectionWebLocks=()=>{try{return window.navigator?.locks??null;}catch{return null;}};
 useEffect(()=>{const update=(event:StorageEvent)=>{if(event.key?.startsWith('datumm-selection-uncertain:'))setSelectionStorageRevision(value=>value+1);};window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);},[]);
 const readMarker=()=>selectionTask&&selectionBrief?readSelectionMarker(selectionStorage(),workspaceAccountKey,selectionTask,selectionBrief):{status:'ready' as const,plan:null};
 const marker=readMarker();
 if(marker.status==='ready'&&marker.plan&&!selectionLocks.current.has(selectionKey))selectionLocks.current.set(selectionKey,{plan:marker.plan,message:'Selection could not be confirmed. Check the saved selection before approval.'});
 const selectionBlocked=()=>{const saved=readMarker();return selectionLocks.current.has(selectionKey)||saved.status!=='ready'||Boolean(saved.plan);};
 const selectionUncertain=Boolean(selectionTask&&selectionBrief&&selectionBlocked()),selectionError=selectionLocks.current.get(selectionKey)?.message??(marker.status!=='ready'&&selectionTask&&selectionBrief?'Selection safety storage is unavailable or invalid. Open a new chat or restore browser storage.':selectionIssue.key===selectionKey?selectionIssue.message:'');
 const withSelectionMutation=async(operation:()=>Promise<void>,allowMarker=false)=>{
  const locks=selectionWebLocks(),token={...workspaceGuard.current},taskId=runId,briefId=run?.data.agent_design?.briefId;
  if(!locks||!taskId||!briefId){setSelectionIssue({key:selectionKey,message:'Selection and approval are unavailable because browser locking is unavailable.'});return;}
  try{await locks.request('datumm-selection-mutation:'+JSON.stringify([workspaceAccountKey,taskId,briefId]),{mode:'exclusive'},async()=>{
   if(!scopeCurrent(token)||!scopeCurrent(actionScope)||currentRun.current?.id!==taskId||currentRun.current?.data.agent_design?.briefId!==briefId||(!allowMarker&&selectionBlocked()))return;
   await operation();
  });}catch(e){if(scopeCurrent(token))setSelectionIssue({key:selectionKey,message:e instanceof Error?e.message:'Selection lock is unavailable.'});}
 };
 const [comparisonRecord,setComparisonRecord]=useState<{key:string;request:number;loading:boolean;error:string;result:{kind:'previous'|'alternative';version:VariableVersion;diff:string}|null}>({key:'',request:0,loading:false,error:'',result:null});
 const comparisonKey=JSON.stringify([workspaceGuard.current.key,workspaceGuard.current.generation,designVersion&&[designVersion.planId,designVersion.version,designVersion.fingerprint],run?.currentPlanRef&&[run.currentPlanRef.planId,run.currentPlanRef.version,run.currentPlanRef.fingerprint],run?.data.agent_design?.briefId,run?.data.agent_design?.candidates.map(c=>[c.planId,c.version,c.fingerprint])]);
 const comparison=comparisonRecord.key===comparisonKey?comparisonRecord:null;
 const compareVersion=comparison?.result?.version??null,designDiff=comparison?.result?.diff??'',comparisonKind=comparison?.result?.kind??null,comparisonError=comparison?.error??'',comparisonLoading=comparison?.loading??false;
 const setCompareVersion=(value:VariableVersion|null)=>{if(value===null)setComparisonRecord(previous=>({...previous,request:previous.request+1,loading:false,result:null,error:''}));};
 const [drawingStyle,setDrawingStyle]=useState<'presentation'|'linework'>('linework');
 const canvasTrigger=useRef<HTMLButtonElement|null>(null);
 const dialogTrigger=useRef<HTMLElement|null>(null);
 const [admissionPending,setAdmissionPending]=useState(false);
 const pendingSubmission=useRef<{text:string;runStarted:boolean;taskId?:string;sourceKey:string;draftStore:PromptDraftStore;draftRevision?:string;startCursor:number;clientSubmissionId:string}|null>(null);
 // The scope captured at submit lets the display-action check tell this browser's own live answer from history.
 const liveSubmission=useRef<{submission:NonNullable<typeof pendingSubmission.current>;key:string;taskId:string|null;scope:{key:string;epoch:number}|null}|null>(null);
 const displayScope=()=>({key:workspaceGuard.current.key,epoch:workspaceGuard.current.generation});
 const workAreaView=useRef<{open:boolean;preview:'drawing'|'answer-output'|'saved-report'}>({open:false,preview:'drawing'});
 useEffect(()=>{const live=liveSubmission.current;if(live&&!live.scope&&live.submission.taskId&&live.submission.taskId===runId){live.taskId=runId;live.scope=displayScope();}},[runId,workspaceScopeInput.key]);
 const recoveryEpoch=useRef(0);
 const observation=useRef<TaskObservation|null>(null);
 const selectedRead=useRef<{taskId:string;epoch:number;startedAt:number;promise:Promise<Run|null>|null}|null>(null);
 const transportMessageOwner=useRef<{accountKey:string;sourceKey:string;taskId:string|null}|null>(null);
 const setMessagesAfterAccountChange=useRef(false);
 const [uiScope,setUiScope]=useState({key:workspaceScopeInput.key,accountKey:workspaceAccountKey});
 if(uiScope.key!==workspaceScopeInput.key){
  setUiScope({key:workspaceScopeInput.key,accountKey:workspaceAccountKey});
  setCanvasOpen(false);setCompareVersion(null);setDrawingError('');setDrawingMissing(false);setDrawingLoading(false);
  setSelectedSourceId('');setSelectedDesignElement('');setDesignHighlights([]);setInspectedDesignFingerprint('');setConnectionNotice('');setError('');setActionBusy(false);
  if(uiScope.accountKey!==workspaceAccountKey){
   accountEpoch.current++;reviewEpoch.current++;recoveryEpoch.current++;pendingSubmission.current=null;submissionKey.current=null;queueRetry.current=null;commandRetry.current.clear();commandExpected.current=null;
   transportMessageOwner.current=null;setRuns([]);setProjects([]);setRunId('');setRun(null);setSourceDrafts({});setAdmissionPending(false);displayPrompt('');setMode('plan');setModel('openai/gpt-6-luna');setReasoningEffort('high');modelPreferenceInitialized.current=false;setMessagesAfterAccountChange.current=true;
  }
 }
 const draftAccountKey=desktopAvailable
  ? !desktopPreview&&admittedSubject&&accountWorkspaceSubject===admittedSubject?'desktop:'+admittedSubject:null
  : !desktopPreview&&authConfigured&&accountKey?'web:'+accountKey:null;
 useEffect(()=>{
  if(draftOwner.current.account!==draftAccountKey){
   if(draftOwner.current.account!==undefined){pendingSubmission.current=null;submissionKey.current=null;recoveryEpoch.current++;}
   promptDrafts.current=createPromptDraftStore({accountKey:draftAccountKey,storage:()=>window.localStorage});
  }
  draftOwner.current={account:draftAccountKey,source:sourceKey};
  displayPrompt(promptDrafts.current.get(sourceKey));
  setDraftSaveStatus(promptDrafts.current.status(sourceKey));
 },[draftAccountKey,sourceKey,displayPrompt]);
 const briefDraftScope={...workspaceGuard.current};
 const prepareProjectBriefReference=(text:string):boolean|string=>{
  if(!scopeCurrent(briefDraftScope)||draftOwner.current.account!==draftAccountKey||draftOwner.current.source!==sourceKey)return false;
  const combined=appendViewportPrompt(promptValue.current,text);
  if(combined.length>12000)return 'This brief and your current draft exceed 12,000 characters. Shorten your draft or paste only the needed brief entries; nothing was added.';
  setPrompt(combined);
  return true;
 };
 const prepareBriefUpdate=()=>{
  // Reject old dialog callbacks, including a task revisited under a later scope generation.
  if(!scopeCurrent(briefDraftScope)||!runId||currentRun.current?.id!==runId||!['completed','failed','cancelled','interrupted'].includes(currentRun.current.status)||hasPendingQuestion(currentRun.current)||(currentRun.current.data as {opencode_questions?: unknown[]}).opencode_questions?.length||draftOwner.current.account!==draftAccountKey||draftOwner.current.source!==sourceKey)return false;
  setPrompt(previous=>appendViewportPrompt(previous,'Revise the task brief with the changes I describe below. Keep other requirements unchanged. Do not change Revit.\n\nChanges: '));
  return true;
 };
 const confirmPromptDraft=(key:string,text:string,store:PromptDraftStore,revision:string|undefined)=>{
  const result=store.confirm(key,text,revision);
  if(promptDrafts.current===store&&draftOwner.current.source===key){setDraftSaveStatus(result);if(promptValue.current===text)displayPrompt(store.get(key));}
 };
 const readSelectedTask=(taskId:string,{route='tasks',readBase=currentRun.current?.id===taskId?currentRun.current:null,followUp}:SelectedTaskRead={}):Promise<Run|null>=>{
  const epoch=recoveryEpoch.current,previous=selectedRead.current;
  if(previous?.taskId===taskId&&previous.epoch===epoch&&previous.promise){
   if(!followUp)return previous.promise;
   // The joined read predates the update that requested this reconciliation.
   const after=(value:Run|null)=>{
    if(epoch!==recoveryEpoch.current||selectedRead.current?.taskId!==taskId)return null;
    return followUp(value)?readSelectedTask(taskId,{route}):value;
   };
   return previous.promise.then(after,()=>after(null));
  }
  const promise=api<Run>(route+'/'+encodeURIComponent(taskId)).then(value=>{
   if(epoch!==recoveryEpoch.current||selectedRead.current?.promise!==promise||value.id!==taskId)return null;
   const current=currentRun.current;
   setRun(value,readBase);
   return current?.id===taskId&&!acceptsTaskSnapshot(current,value,readBase)?current:value;
  }).finally(()=>{if(selectedRead.current?.promise===promise)selectedRead.current.promise=null;});
  selectedRead.current={taskId,epoch,startedAt:Date.now(),promise};
  return promise;
 };
 const recoverLiveView=(requestId:string,taskId?:string,code?:string)=>{
  const epoch=recoveryEpoch.current;
  if(observation.current?.requestId===requestId)observation.current=null;
  setError('');setConnectionNotice(code&&code!=='DATUMM_STREAM_INTERRUPTED'?'Checking the saved task after the run stopped or paused…':'Checking the saved task after the live stream ended…');
  if(taskId)void readSelectedTask(taskId,{followUp:()=>true}).then(task=>{if(task&&recoveryEpoch.current===epoch)setConnectionNotice(savedTaskConnectionNotice(task));}).catch(()=>{if(recoveryEpoch.current===epoch)setConnectionNotice('Saved task updates are unavailable. Check the connection before retrying; this message was already admitted.');});
 };
 // History rows are a useful immediate preview, not an authoritative task read.
 const refreshSelectedTask=async(taskId:string,options?:SelectedTaskRead)=>{
  const epoch=recoveryEpoch.current;
  try{await readSelectedTask(taskId,options);}
  catch{if(epoch===recoveryEpoch.current)setConnectionNotice('The saved chat is shown, but its latest updates could not be checked. Reopen it to retry.');}
 };
 const startObservation=(taskId:string,requestId:string,cursor:number):TaskObservation=>{
  const value={taskId,requestId,epoch:recoveryEpoch.current,sequence:cursor,lastProgressAt:-Infinity,checkpoint:0,final:false};
  observation.current=value;
  return value;
 };
 const observeProgress=(value:unknown)=>{
  const observed=observation.current;
  if(!observed||observed.epoch!==recoveryEpoch.current||!value||typeof value!=='object'||!('stage' in value)||typeof value.stage!=='string')return;
  if(value.stage==='snapshot'){
   if(!('run' in value)||!value.run||typeof value.run!=='object'||!('id' in value.run)||value.run.id!==observed.taskId||!('events' in value.run)||!Array.isArray(value.run.events)||!('data' in value.run)||!value.run.data||typeof value.run.data!=='object'||!('status' in value.run)||typeof value.run.status!=='string')return;
   const saved=value.run as Run,current=currentRun.current;
   if(current?.id===saved.id&&!acceptsTaskSnapshot(current,saved))return;
   observed.final||=terminal.has(saved.status);
   observed.lastProgressAt=Date.now();
   setRun(saved);
   return;
  }
  if(!('index' in value)||typeof value.index!=='number'||!Number.isSafeInteger(value.index)||value.index<0||!('detail' in value)||typeof value.detail!=='string'||('taskId' in value&&value.taskId!==undefined&&value.taskId!==observed.taskId))return;
  const event={...(value as RunEvent),taskId:observed.taskId};
  const sequence=event.sequence??event.index+1;
  if(!Number.isSafeInteger(sequence)||sequence<1)return;
  if(sequence>observed.sequence){
   observed.sequence=sequence;
   observed.lastProgressAt=Date.now();
   if(terminal.has(event.stage)||checkpointStages.has(event.stage))observed.checkpoint=sequence;
  }
  setProjection(previous=>reduceProjection(previous,{event}));
 };
 const openCanvas=(trigger:HTMLButtonElement)=>{canvasTrigger.current=trigger;setStudioView('workspace');closeProperties();setCanvasOpen(true);};
 const restoreDialogFocus=(event:Event)=>{event.preventDefault();const opener=dialogTrigger.current;const trigger=opener?.isConnected&&opener.getClientRects().length&&!opener.closest('[hidden],[inert]')?opener:Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Open workspace navigation"],[aria-label="Expand navigation"],[aria-label="Show sidebar"],[aria-label^="Account settings"],[aria-label="Search chats and projects"],[aria-label="Search tasks"]')).find(element=>element.getClientRects().length>0&&!element.closest('[hidden],[inert]'));trigger?.focus();};
 const planSummary=run?.data.plan?`Plan revision ${run.data.plan.version} is ready. Review the layout below, describe a change, or build this version in Revit.`:null;
 const outcome=run?.modelOutcome;
 const proposalExpired=Boolean(run?.data.proposal?.expiresAt&&Date.parse(run.data.proposal.expiresAt)<=Date.now());
 const committedBuild=outcome?.state==='committed_unverified'||outcome?.state==='committed_verified';
 const canRefreshFailedPreparation=Boolean(run?.status==='failed'&&(run.data.variable_selection||run.data.m09_revision)&&run.data.proposal&&!committedBuild&&['preparation_read_unavailable','native_busy','connection_error'].includes(run.data.failure?.code??''));
 const canEndFailedPreparation=Boolean(run?.status==='failed'&&run.data.variable_selection&&!committedBuild&&run.data.recovery?.data?.state==='rolled_back'&&run.data.recovery.data.sameDocument===true);
 const plannedAccessBatches=Math.min(3,run?.data.agent_task_plan?.steps.filter(step=>step.action==='execute_changes').length??1);
 const batchProgressCount=nativeBatchProgress(run);
 const batchInProgress=batchProgressCount>0;
 const partialGoal=run?.data.agent_result?.status==='partial';
 const confirmedAnnotationFailure=outcome?.verifiedBatches===1&&run?.data.recovery?.data?.state==='failed'&&run.data.recovery.data.sameDocument===true;
 const buildSummary=run?.mode==='build'?run.status==='awaiting_approval'?`${outcome?.verifiedBatches?`${outcome.verifiedBatches} native batch verified. Tags and dimensions require a separate exact approval. `:''}The rollback dry run passed. Review the exact proposal below and approve it to build in Revit. No model changes were made by the dry run.`:outcome?.verifiedBatches&&!outcome.completedBuild?`${outcome.verifiedBatches} of ${outcome.expectedBatches} native batches passed read-back. The full build remains incomplete; inspect the pending or failed operation before continuing.`:batchInProgress?`${batchProgressCount} native ${batchProgressCount===1?'batch':'batches'} verified. DATUMM is checking the updated model before the next planned step.`:partialGoal?(outcome?.verified?'Revit verified the recorded native changes, but the overall goal remains partial. Review the remaining criteria below.':'The overall goal remains partial. Review the findings and verification limits below.'):outcome?.verified?`${queueData?.native_build?'The approved native proposal':run.data.draft_task?'The drafting task':run.data.variable_selection?'The selected concept':run.data.selected_plan?'The saved plan':'The verified 3BHK demonstration'} was built and verified in Revit. Review the element counts and save the project when you are ready.`:run.status==='failed'?(committedBuild?'The build committed in Revit. Full verification is unavailable; review the operation status below. Do not rebuild this plan.':outcome?.state==='unknown'?'The write outcome is unknown. Reconnect and check the original operation status before any new build.':'The build stopped. Review the error below.'):null:null;
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
 // An edited version (M1) is the current plan but not one of the original alternatives; bind it through its
 // lineage. The server still checks it is the task's current plan, latest version and exact fingerprint.
 const editedLineage=designVersion&&run?.currentPlanRef?.planId===designVersion.planId&&run.currentPlanRef.version===designVersion.version&&run.currentPlanRef.fingerprint===designVersion.fingerprint?run.data.agent_design?.candidates.find(c=>c.planId===designVersion.planId):undefined;
 const selectedDesignCandidate=run?.data.agent_design?.candidates.find(c=>c.planId===designVersion?.planId&&c.version===designVersion?.version)??(editedLineage&&designVersion?{...editedLineage,version:designVersion.version,fingerprint:designVersion.fingerprint}:undefined)??run?.data.agent_design?.candidates.find(c=>c.planId===run.currentPlanRef?.planId&&c.version===run.currentPlanRef.version)??run?.data.agent_design?.candidates[0];
 const drawingCurrent=Boolean(!selectionUncertain&&designVersion&&run?.currentPlanRef?.planId===designVersion.planId&&run.currentPlanRef.version===designVersion.version&&run.currentPlanRef.fingerprint===designVersion.fingerprint);
 const revisionCandidate=Boolean(designVersion&&run?.data.agent_design?.candidates.some(c=>c.planId===designVersion.planId&&c.version===designVersion.version&&c.fingerprint===designVersion.fingerprint));
 const planRevisionBlockedReason=selectionUncertain?'Check the saved selection before revising this brief.':!drawingCurrent||!revisionCandidate||drawingError||drawingLoading?'Open the current drawing before revising this brief.':!run||!['completed','failed','cancelled','interrupted'].includes(run.status)||hasPendingQuestion(run)||(run.data as {opencode_questions?:unknown[]}).opencode_questions?.length?'Finish the active work or answer the pending question before revising.':'';
 const revisionScope={...workspaceGuard.current},revisionEpoch=reviewEpoch.current,revisionBrief=run?.data.agent_design?.briefId,revisionDrawing=designVersion&&[designVersion.planId,designVersion.version,designVersion.fingerprint].join('\u0000');
 const preparePlanRevision=()=>{
  const current=currentRun.current,draw=currentDrawing.current,ref=current?.currentPlanRef;
  if(planRevisionBlockedReason||selectionBlocked()||!scopeCurrent(revisionScope)||reviewEpoch.current!==revisionEpoch||!current||!draw||!ref||current.id!==runId||current.data.agent_design?.briefId!==revisionBrief||!current.data.agent_design?.candidates.some(c=>c.planId===draw.planId&&c.version===draw.version&&c.fingerprint===draw.fingerprint)||[draw.planId,draw.version,draw.fingerprint].join('\u0000')!==revisionDrawing||draw.planId!==ref.planId||draw.version!==ref.version||draw.fingerprint!==ref.fingerprint)return false;
  return prepareBriefUpdate();
 };
 const reviewAssumptions=Array.from(new Set([...(run?.data.agent_design?.assumptions??[]),...(designVersion?.graph.assumptions??[])]));
 const planAccepted=Boolean(drawingCurrent&&run?.acceptance?.plan.planId===designVersion?.planId&&run?.acceptance?.plan.version===designVersion?.version&&run?.acceptance?.plan.fingerprint===designVersion?.fingerprint);
 const buildStep=run?.data.agent_design?planBuildStep(run,drawingCurrent&&!drawingError?designVersion:null,placementTask===run.id&&Boolean(confirmedPlacement)):null;
 useEffect(()=>{
  const token={...workspaceGuard.current},ref=run?.currentPlanRef;
  if(!run?.data.agent_design||ref?.source!=='variable'){setDrawingLoading(false);return;}
  let cancelled=false;setDrawingLoading(true);setDrawingError('');setDrawingMissing(false);
  void api<VariableVersion>(`variable/plans/${ref.planId}/versions/${ref.version}${drawingRetry?'?retryRender=true':''}`).then(value=>{
   if(cancelled||!scopeCurrent(token))return;
   if(value.planId!==ref.planId||value.version!==ref.version||value.fingerprint!==ref.fingerprint)throw Error('Saved drawing identity changed.');
   if(!designVersion||designVersion.planId!==value.planId||designVersion.version!==value.version||designVersion.fingerprint!==value.fingerprint)setDrawingStyle('linework');
   setDesignVersion(value,token);
  }).catch(e=>{if(!cancelled&&scopeCurrent(token)){setDrawingError((e as Error).message);setDrawingMissing((e as Error&{status?:number}).status===404);}}).finally(()=>{if(!cancelled&&scopeCurrent(token))setDrawingLoading(false);});
  return()=>{cancelled=true;};
 },[workspaceScopeInput.key,run?.id,run?.currentPlanRef?.planId,run?.currentPlanRef?.version,run?.currentPlanRef?.fingerprint,drawingRetry]);
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
 const scheduleGraph=run?.data.agent_design&&designVersion&&selectedDesignCandidate?.planId===designVersion.planId&&selectedDesignCandidate.version===designVersion.version&&selectedDesignCandidate.fingerprint===designVersion.fingerprint?designVersion.graph:null;
 const previewRooms=roomAreaSchedule(run?.data.compiled?.areas,scheduleGraph,run?.data.agent_design?.previewRooms,run?.data.inventory?.rooms);
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

 const transport=useMemo(()=>new AguiChatTransport(),[]);

 const {messages:transportMessages,sendMessage,status,setMessages,stop,error:chatError}=useChat({transport,onData:part=>{

  if(!pendingSubmission.current || !part.data || typeof part.data !== 'object' || !('clientSubmissionId' in part.data) || part.data.clientSubmissionId !== pendingSubmission.current.clientSubmissionId)return;
  if(part.type==='data-run'){
   if(!('id' in part.data)||typeof part.data.id!=='string'||! /^[a-zA-Z0-9-]{1,128}$/.test(part.data.id))return;
   const taskId=part.data.id;
   if(pendingSubmission.current){
    const pending=pendingSubmission.current,key=pending.sourceKey;
    if(pending.runStarted)return;
    pending.runStarted=true;pending.taskId=taskId;
    startObservation(taskId,pending.clientSubmissionId,pending.startCursor);
    if(transportMessageOwner.current)transportMessageOwner.current.taskId=taskId;
    confirmPromptDraft(key,pending.text,pending.draftStore,pending.draftRevision);
    if((key==='new'||key.startsWith('new:'))&&key!==taskId)pending.draftStore.move(key,taskId);
    setSourceDrafts(previous=>({...previous,[key]:[]}));
   }
   submissionKey.current=null;
   setRunId(taskId);setAdmissionPending(false);
  }

   if(part.type==='data-progress'&&observation.current?.requestId===part.data.clientSubmissionId&&'record' in part.data)observeProgress(part.data.record);

 }});

 const messageOwner=transportMessageOwner.current;
 const messages=messageOwner?.accountKey===workspaceAccountKey&&(runId?messageOwner.taskId===runId:messageOwner.sourceKey===sourceKey&&!messageOwner.taskId)?transportMessages:[];
 useEffect(()=>{if(setMessagesAfterAccountChange.current){setMessagesAfterAccountChange.current=false;setMessages([]);setAdmissionPending(false);}},[workspaceAccountKey]);
 const admitted=pendingSubmission.current?.runStarted&&pendingSubmission.current.taskId===runId&&['submitted','streaming'].includes(status)?pendingSubmission.current:null;
 const admittedTerminal=admitted&&(events.some(event=>(event.sequence??event.index+1)>admitted.startCursor&&terminal.has(event.stage))||Boolean(run&&terminal.has(run.status)&&(run.eventCursor??0)>admitted.startCursor));
 const paused=admitted?Boolean(admittedTerminal):Boolean(run&&terminal.has(run.status))||terminal.has(events.at(-1)?.stage??'');
 const executing=!paused&&(status==='streaming'||status==='submitted'||Boolean(run&&!terminal.has(run.status)));
 const cancelPending=stopRequested(run,events);
 const cancelPendingRef=useRef(cancelPending);cancelPendingRef.current=cancelPending;
 const replying=useRef(false);
 const questionObserver=useRef<AbortController|null>(null);
 useEffect(()=>()=>{questionObserver.current?.abort();questionObserver.current=null;},[workspaceAccountKey,runId]);
  const busy=executing||actionBusy||mediaBusy||admissionPending||cancelPending||Boolean(runId&&!run);
  const queueMessage=!cancelPending&&liveRuntime&&Boolean(run)&&(executing||promptQueue.length>0);

 // A refused first prompt never created a task: take its optimistic bubble back (the text returns to the composer).
 const dropOptimistic=(text:string)=>setMessages(list=>{const i=list.map(m=>m.role==='user'&&m.parts.some(p=>p.type==='text'&&p.text===text)).lastIndexOf(true);return i<0?list:list.filter((_,k)=>k!==i);});
 useEffect(()=>{
  if(!chatError)return;
  const pending=pendingSubmission.current;
   if(!pending)return;
  if(!pending.runStarted&&liveSubmission.current?.submission===pending)liveSubmission.current=null;
  if(pending&&!pending.runStarted){setPrompt(current=>current||pending.text);if(!currentRun.current)dropOptimistic(pending.text);}
  pendingSubmission.current=null;setAdmissionPending(false);
  if(pending?.runStarted){
   recoverLiveView(pending.clientSubmissionId,pending.taskId||currentRun.current?.id,(chatError as {code?:string}).code);return;
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
  // Invalidate synchronously during render, before an old effect can publish or
  // a newly selected device can inherit the previous device's session count.
  const sessionIdentity=JSON.stringify([workspaceAccountKey,liveRuntime,selectedDevice?.id??null,Boolean(selectedDevice?.online)]);
  const sessionScope=useRef({identity:sessionIdentity,generation:0});
  if(sessionScope.current.identity!==sessionIdentity)sessionScope.current={identity:sessionIdentity,generation:sessionScope.current.generation+1};
  const sessionGeneration=sessionScope.current.generation;
  const revitSessions=liveRuntime?devices.length:sessionObservation?.generation===sessionGeneration?sessionObservation.count:null;
  useEffect(()=>{
   if(!liveRuntime||!useCurrentModel||!selectedDevice?.online){setNativeContext(null);setNativeContextError('');return;}
   let live=true;setNativeContext(null);
   const stop=settledPoll(async()=>{try{const value=await api<{sessionId:string;observedAt:string;context:Record<string,unknown>}>(`devices/${selectedDevice.id}/context`);if(live){setNativeContext(value);setNativeContextError('');}}catch(error){if(live){setNativeContext(null);setNativeContextError((error as Error).message);}}},10000);
   return()=>{live=false;stop();};
  },[liveRuntime,useCurrentModel,selectedDevice?.id,selectedDevice?.online]);

 useEffect(()=>{
  const narrow=window.matchMedia('(max-width:899px)');
  const update=()=>{if(narrow.matches){setDrawerLeft(false);if(settingsPreviousLeft.current)settingsPreviousLeft.current.drawer=false;}setNavigationNarrow(narrow.matches);setViewportReady(true);};
  update();narrow.addEventListener('change',update);
  return()=>narrow.removeEventListener('change',update);
 },[]);

 useEffect(()=>{
  const closeDrawer=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||Array.from(document.querySelectorAll('[role="dialog"],[role="menu"]')).some(dialog=>dialog.id!=='workspace-navigation'&&dialog.getClientRects().length>0))return;
   if(left&&window.matchMedia('(max-width:899px)').matches){
    event.preventDefault();setLeft(false);requestAnimationFrame(()=>Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="Open workspace navigation"],[aria-label="Expand navigation"],[aria-label="Show sidebar"]')).find(element=>element.getClientRects().length>0&&!element.closest('[hidden],[inert]'))?.focus());return;
   }
  };
  document.addEventListener('keydown',closeDrawer);
  return()=>document.removeEventListener('keydown',closeDrawer);
 },[left,navigationNarrow]);

 const refreshRuns=useCallback(async()=>{
   if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return true;
   const epoch=accountEpoch.current;
   try{const history=await api<Run[]>('runs'+(historyView==='archived'?'?archived=true':''));if(epoch===accountEpoch.current){setRuns(history);setConnected(true);}return true;}
   catch{if(epoch===accountEpoch.current)setConnected(false);return false;}
 },[historyView,desktopPreview,accountStatus?.state,testIdentity]);
 const refresh=useCallback(async()=>{
   if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return true;
   const epoch=accountEpoch.current;
   // Independent of the rest: a slow or dropped runs request must not skip projects.
   void api<ProjectRow[]>('projects'+(!desktopAvailable&&historyView==='archived'?'?archived=true':'')).then(value=>{if(epoch===accountEpoch.current&&Array.isArray(value)){setProjects(value);setProjectsState('supported');}}).catch(failure=>{if(epoch===accountEpoch.current&&!desktopAvailable)setProjectsState(previous=>projectsStatus(previous,failure));});
   try{const [configuration,list,history,tools]=await Promise.all([api<RuntimeConfig>('config'),api<Device[]>('devices'),api<Run[]>('runs'+(historyView==='archived'?'?archived=true':'')),Promise.resolve<McpTool[]>([])]);
    if(epoch!==accountEpoch.current)return true;
    setRuntimeConfig(configuration);setMcpTools(tools);setServiceError('');

   setConnected(true);setModels(configuration.models);if(!modelPreferenceInitialized.current){const taskFromUrl=new URLSearchParams(window.location.search).get('task');if(!taskFromUrl){setModel(configuration.defaultModel??'openai/gpt-6-luna');setReasoningEffort(configuration.defaultReasoningEffort??'high');}modelPreferenceInitialized.current=true;}setDevices(list);setRuns(history);

   setDeviceId(previous=>chooseDevice(previous,list));
   return true;
  }catch{if(epoch===accountEpoch.current){setConnected(false);setServiceError('DATUMM could not load the workspace service. Check your connection and retry. Your draft is preserved.');}return false;}finally{if(epoch===accountEpoch.current)setWorkspaceReady(true);}

 },[historyView,desktopPreview,accountStatus?.state,testIdentity]);

 useEffect(()=>{
  if(!desktopAvailable||desktopPreview)return;
  if(!admittedSubject){accountEpoch.current++;return;}
  if(accountWorkspaceSubject===admittedSubject)return;
  let active=true;
  accountEpoch.current++;
  if(accountWorkspaceSubject){
   setRuns([]);setProjects([]);setRun(null);setRunId('');setMessages([]);displayPrompt('');setNewProject('');setMode('plan');setSourceDrafts({});setSavedSources([]);setSelectedSourceId('');
   setUseCurrentModel(false);setDesignVersion(null);setCompareVersion(null);setInspectedDesignFingerprint('');setDesignHighlights([]);setSelectedDesignElement('');setPlanningGoalOpen(false);
   placementDrafts.current.clear();notificationStates.current.clear();pendingSubmission.current=null;submissionKey.current=null;queueRetry.current=null;commandRetry.current.clear();commandExpected.current=null;recoveryEpoch.current++;
   modelPreferenceInitialized.current=false;setError('');setServiceError('');setConnectionNotice('');
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

  // One stable loop: chat list every 6 s while a chat runs (else 30 s); config, devices and projects every 60 s,
  // or every 15 s while no Revit device is online, so a newly connected Revit shows up without a reload.
  const loopRefs=useRef({refresh,refreshRuns,runs,deviceOnline:false});loopRefs.current={refresh,refreshRuns,runs,deviceOnline:Boolean(selectedDevice?.online)};
  const firstRefresh=useRef(true);
  useEffect(()=>{
   let last=0;
   return settledPoll(()=>{
    if(Date.now()-last>=(loopRefs.current.deviceOnline?60000:15000)){last=Date.now();return loopRefs.current.refresh();}
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
  if(liveRuntime||!selectedDevice?.online)return;
  let live=true;const current=()=>live&&sessionScope.current.generation===sessionGeneration;
  const check=async()=>{try{const sessions=await api<{sessionId:string}[]>(`devices/${selectedDevice.id}/tools`,'POST',{name:'list_revit_sessions',arguments:{}});if(current())setSessionObservation({generation:sessionGeneration,count:Array.isArray(sessions)&&sessions.every(session=>session&&typeof session.sessionId==='string'&&Boolean(session.sessionId.trim()))?sessions.length:null});}catch{if(current())setSessionObservation({generation:sessionGeneration,count:null});}};
  const stop=settledPoll(check,7000);return()=>{live=false;stop();};
  },[sessionGeneration]);

 useEffect(()=>{
  if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return;
   const epoch=recoveryEpoch.current;let live=true;
  const taskId=new URL(window.location.href).searchParams.get('task');
  if(taskId)setRunId(taskId);
   if(taskId)void readSelectedTask(taskId).then(value=>{if(!value||!live||epoch!==recoveryEpoch.current)return;setMode(value.mode);setModel(value.model);setReasoningEffort(value.reasoningEffort??'high');}).catch(e=>{if(live&&epoch===recoveryEpoch.current)setError((e as Error).message);});
   return()=>{live=false;};
 },[desktopPreview,accountStatus?.state,testIdentity]);

 useEffect(()=>{
  if(!runId)return;
  const url=new URL(window.location.href);
  url.searchParams.set('task',runId);
  window.history.replaceState(null,'',url);
 },[runId]);

 const taskObservation=observation.current?.epoch===recoveryEpoch.current&&observation.current.taskId===runId?observation.current:null;
 const pollStatus=taskObservation&&!taskObservation.final&&(admitted||questionObserver.current)&&!admittedTerminal?'running':run?.status;
 const openPollMs=openChatPollMs(pollStatus);
 const pollState=useRef({pollStatus,hasBase:false});pollState.current={pollStatus,hasBase:Boolean(run&&!projection.pending.length)};
 const gap=projection.taskId===runId?projection.pending[0]:undefined;
 const gapSequence=gap?.sequence??(gap?gap.index+1:0);
 const checkpointSequence=(taskObservation?.checkpoint??0)>(run?.eventCursor??0)?taskObservation?.checkpoint:0;
 const selectedListVersion=runs.find(value=>value.id===runId)?.taskVersion;
 useEffect(()=>{
  const selected=currentRun.current;
  // A newer list revision can resume a settled task in another tab. Fetch its
  // complete record instead of replacing it with a possibly partial list row.
  if(selected?.id===runId&&typeof selectedListVersion==='number'&&typeof selected.taskVersion==='number'&&selectedListVersion>selected.taskVersion){
   void refreshSelectedTask(runId,{followUp:value=>Math.max(value?.taskVersion??0,currentRun.current?.taskVersion??0)<selectedListVersion});
  }
 },[runId,selectedListVersion,workspaceAccountKey]);
 useEffect(()=>{
  if(runId&&(gapSequence||checkpointSequence))void readSelectedTask(runId,{route:'runs'}).catch(()=>{});
 },[runId,gapSequence,checkpointSequence,workspaceAccountKey]);
 useEffect(()=>{
  if(!runId||openPollMs===null)return;
  const epoch=recoveryEpoch.current;
  return settledPoll(async()=>{
   if(epoch!==recoveryEpoch.current)return;
   const now=Date.now(),observed=observation.current,{pollStatus,hasBase}=pollState.current,last=selectedRead.current;
   // A quiet stream falls back on the next fast tick, even when no new frame renders the hook.
   const healthy=hasBase&&observed?.taskId===runId&&observed.epoch===epoch&&!observed.final&&now-observed.lastProgressAt<6000;
   const delay=openChatPollMs(pollStatus,healthy);
   if(delay!==null&&(!last||last.epoch!==epoch||last.taskId!==runId||now-last.startedAt>=delay))await readSelectedTask(runId,{route:'runs'});
  },openPollMs);
 },[runId,openPollMs,workspaceAccountKey]);

 const replyToQuestion=async(payload:ReplyPayload|{question_id:string;answer:string})=>{
  if(cancelPendingRef.current)throw new Error('Stop requested. Wait for the task status before answering.');
  if(!run||replying.current)throw new Error('Your answer is already being sent.');
  const replyDraftStore=promptDrafts.current,replyDraft=prompt,replySource=sourceKey,replyDraftRevision=replyDraftStore.revision(sourceKey),replyEpoch=recoveryEpoch.current;
  const replyQuestionVersion=('question_version' in payload?payload.question_version:undefined)??run.data.agent_question?.version??1;
  if(run.status!=='needs_input'||run.data.agent_question?.id!==payload.question_id||(run.data.agent_question?.version??1)!==replyQuestionVersion)throw new Error('The saved question changed. Review it before answering.');
  replying.current=true;setActionBusy(true);setError('');
  try{
   const command={type:'answer',questionId:payload.question_id,questionVersion:replyQuestionVersion,...('answer' in payload?{answer:payload.answer}:{answers:payload.answers})};
   const signature=JSON.stringify({taskId:run.id,command});
   let request=commandRetry.current.get(signature);
   if(!request){const expected=expectedVersion();request={schemaVersion:2,idempotencyKey:crypto.randomUUID(),expectedTaskVersion:expected.taskVersion,expectedPlanVersion:expected.planVersion,command:{schemaVersion:2,...command}};commandRetry.current.set(signature,request);}
   const isCurrent=()=>replyEpoch===recoveryEpoch.current&&currentRun.current?.id===run.id;
   try{
    questionObserver.current?.abort();const observer=new AbortController();questionObserver.current=observer;
    const answer={questionId:command.questionId,questionVersion:command.questionVersion,...('answer' in command?{answer:command.answer}:{answers:command.answers})};
     const replySubmissionId=crypto.randomUUID();
     const stream=await transport.resumeQuestion({taskId:run.id,idempotencyKey:request.idempotencyKey,expectedTaskVersion:request.expectedTaskVersion,expectedPlanVersion:request.expectedPlanVersion,eventCursor:projection.cursor},payload.question_id,replyQuestionVersion,answer,replySubmissionId,observer.signal);
     const reader=stream.getReader();let observed:TaskObservation|null=null;
    const observe=async()=>{try{for(;;){const next=await reader.read();if(next.done)break;if(!isCurrent())continue;const part=next.value;
       if(observation.current===observed&&part.type==='data-progress'&&part.data&&typeof part.data==='object'&&'record' in part.data)observeProgress(part.data.record);
     }}catch{if(isCurrent()&&observation.current===observed)recoverLiveView(replySubmissionId,run.id);}finally{if(observation.current===observed)observation.current=null;if(questionObserver.current===observer)questionObserver.current=null;reader.releaseLock();}};
    // Admission must be observed before clearing the answer; observation continues in the background.
     for(;;){const next=await reader.read();if(!isCurrent()){await reader.cancel();return;}if(next.done)throw new Error('The answer could not be confirmed. Check the saved task before retrying.');if(next.value.type==='data-run'){observed=startObservation(run.id,replySubmissionId,projection.cursor);break;}}
    commandRetry.current.delete(signature);void observe();
   }
   catch(failure){
    if(replyEpoch!==recoveryEpoch.current)return;
    // A lost HTTP response can follow an accepted atomic resume. Read its
    // receipt before offering a retry; never create a second task.
    const readBase=currentRun.current;
    const current=await api<Run>(`runs/${run.id}`).catch(()=>null);
    if(replyEpoch!==recoveryEpoch.current)return;
    const applied=(current as (Run&{commandReceipts?:{commandId:string;state:string}[]})|null)?.commandReceipts?.some(row=>row.commandId===request.idempotencyKey&&row.state==='applied');
    if(current?.id!==run.id||!applied||current.data.agent_reply_receipt?.questionId!==payload.question_id||current.data.agent_reply_receipt.version!==replyQuestionVersion){
     const status=(failure as Error&{status?:number}).status;
     if(status&&status<500){commandRetry.current.delete(signature);if(current?.id===run.id){setRun(current,readBase);commandExpected.current={taskId:run.id,taskVersion:current.taskVersion??0,planVersion:current.currentPlanRef?.version??0};}}
     throw failure;
    }
    commandRetry.current.delete(signature);
   }
   if('answer' in payload&&payload.answer.trim()===replyDraft.trim())confirmPromptDraft(replySource,replyDraft,replyDraftStore,replyDraftRevision);
   if(replyEpoch!==recoveryEpoch.current)return;
    const readBase=currentRun.current;
    const current=await api<Run>(`runs/${run.id}`).catch(()=>null);
   if(replyEpoch!==recoveryEpoch.current)return;
    setRun(current??{...run,status:'queued',data:{...run.data,agent_question:undefined}},readBase);
  }finally{replying.current=false;if(replyEpoch===recoveryEpoch.current)setActionBusy(false);}
 };

  const submitCore=async(text=prompt,recipe=false,override?:Mode,variableSelection?:VariableBinding,draftFingerprint?:string)=>{
   const sendModel=modelOverride.current??model;
   if(!hasPromptContent(text)||actionBusy||mediaBusy||admissionPending||cancelPending||(pendingSubmission.current&&!pendingSubmission.current.runStarted)||runId&&!run)return;
   if((override??mode)==='build'&&run?.data.agent_design&&selectionBlocked()){setError('Check the saved selection before Build.');return;}
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
   const preserveDraft=text!==prompt;
  // needs_input is authoritative even if the chat transport is closing.
  if(run?.status==='needs_input'&&run.data.agent_question){
   if((run.data.agent_question.questions?.length??1)>1){setError('Answer the question group above, then submit all answers together.');return;}
   try{await replyToQuestion({question_id:run.data.agent_question.id,answer:text.trim()});}
   catch(failure){setError((failure as Error).message);}return;
  }
   if(queueMessage&&!variableSelection&&run){
     const queueEpoch=recoveryEpoch.current,queueDraftStore=promptDrafts.current,queueDraftRevision=queueDraftStore.revision(sourceKey);
    const queuedMode=override??mode;
    if(recipe){setError('Legacy recipes cannot be queued. Native approvals must be reviewed separately.');return;}
    const value={prompt:text.trim(),mode:queuedMode,model,reasoningEffort,deviceId:deviceId||run.device_id||null,attachmentIds:sources.map(row=>row.id)};
    const signature=JSON.stringify({taskId:run.id,...value});
    if(queueRetry.current?.signature!==signature)queueRetry.current={signature,id:crypto.randomUUID()};
    setActionBusy(true);setError('');
    try{
     await api(`tasks/${run.id}/queue`,'POST',{id:queueRetry.current.id,...value});
     confirmPromptDraft(sourceKey,text,queueDraftStore,queueDraftRevision);
      if(queueEpoch!==recoveryEpoch.current)return;
     queueRetry.current=null;setSources([]);
      const saved=await api<Run>(`tasks/${run.id}`);if(queueEpoch===recoveryEpoch.current)setRun(saved);
     }catch(failure){if(queueEpoch===recoveryEpoch.current)setError((failure as Error).message+' Your prompt is preserved.');}
    finally{if(queueEpoch===recoveryEpoch.current)setActionBusy(false);}return;
   }
   if(busy&&!variableSelection)return;
  if((override??mode)==='build'&&(!selectedDevice?.online||revitSessions!==1)){
   setError(!selectedDevice?.online?(devices.some(d=>d.online)?'Select your online Revit device in Connections before building.':'Build needs the DATUMM Revit plugin connected. Follow the setup steps above the message box, or continue in Plan mode. Your prompt is preserved.'):'Enable the DATUMM local bridge in Revit and close its settings panel before building.');return;
  }
   setError('');setConnectionNotice('');if(!run){setRun(null);setRunId('');setDesignVersion(null);}if(!preserveDraft)displayPrompt('');
  if(run?.data.agent_design&&(override??mode)==='build'&&!run.data.compiled&&!run.data.operation_id)setBuildSetupOpen(true);
  const epoch=recoveryEpoch.current,submission={text,runStarted:false,sourceKey,draftStore:promptDrafts.current,draftRevision:promptDrafts.current.revision(sourceKey),startCursor:run?projection.cursor:0,clientSubmissionId:crypto.randomUUID()};pendingSubmission.current=submission;transportMessageOwner.current={accountKey:workspaceAccountKey,sourceKey,taskId:runId||null};setAdmissionPending(true);
  const isCurrent=()=>recoveryEpoch.current===epoch&&pendingSubmission.current===submission;

  const signature=JSON.stringify({taskId:run?.id,text,mode:override??mode,model:sendModel,reasoningEffort,recipe,projectId:newProject,attachmentIds:sources.map(row=>row.id)});
  if(submissionKey.current?.signature!==signature)submissionKey.current={signature,key:crypto.randomUUID()};
  const requestKey=submissionKey.current;
  // The idempotency key becomes the command id, which the task reports as this answer's turnId.
  liveSubmission.current={submission,key:requestKey.key,taskId:run?.id??null,scope:run?displayScope():null};
  try{
   if(run&&(override??mode)!==run.mode)await taskCommand({type:'change_mode',mode:override??mode});
   if(!isCurrent())return;
   if(run&&!requestKey.body){
    const saved=await api<Run>(`tasks/${run.id}`);
    if(!isCurrent())return;
    if(saved.status==='queued'||saved.status==='running')throw new Error('This task is running. Queue the next prompt instead.');
    submission.startCursor=Math.max(submission.startCursor,saved.eventCursor??0);
    setRun(saved);
    commandExpected.current={taskId:saved.id,taskVersion:saved.taskVersion??0,planVersion:saved.currentPlanRef?.version??0};
   }
   const expected=expectedVersion();
   requestKey.body??={frontendContext:featureEnabled(capabilities,'frontendContext')?buildFrontendContext({viewportWidth,workAreaOpen:workAreaView.current.open,section:workAreaSection,preview:workAreaView.current.preview,selectedKey:selectedDesignElement,roomKeys:plannedCandidate?.graph.rooms.map(room=>room.key),actions:featureEnabled(capabilities,'displayActions')?undefined:[]})??undefined:undefined,mode:override??mode,model:sendModel,reasoningEffort,modelContextRequirement:useCurrentModel?'read':'auto',deviceId:deviceId||run?.device_id,recipe,taskId:run?.id,projectId:run?undefined:newProject||undefined,idempotencyKey:requestKey.key,expectedTaskVersion:expected.taskVersion,expectedPlanVersion:expected.planVersion,eventCursor:submission.startCursor,visiblePlan:drawingCurrent&&!drawingError?run?.currentPlanRef:null,acceptedAssumptions:reviewAssumptions,placement:placementTask===run?.id?confirmedPlacement:null};
   requestKey.body.attachmentIds=sources.map(row=>row.id);
    await sendMessage({text},{body:{...requestKey.body,clientSubmissionId:submission.clientSubmissionId}});
    const observed=observation.current;
    if(isCurrent()&&observed?.requestId===submission.clientSubmissionId){
     observation.current=null;
     if(!observed.final)void readSelectedTask(observed.taskId,{followUp:()=>true}).catch(()=>{});
    }
  }catch(failure){
    if(!submission.runStarted&&liveSubmission.current?.submission===submission)liveSubmission.current=null;
    if(!isCurrent())return submission.runStarted;
    if(!pendingSubmission.current?.runStarted&&!preserveDraft)setPrompt(current=>current||text);
    if(!pendingSubmission.current?.runStarted&&!currentRun.current)dropOptimistic(text);
   const known=chatStartFailure(failure);
    setBlockedChat(known?.blockingTask?{id:known.blockingTask.id,message:known.message}:null);
   if(known?.state==='rejected')submissionKey.current=null;
   if(pendingSubmission.current?.runStarted)recoverLiveView(submission.clientSubmissionId,pendingSubmission.current.taskId);
   else setError(known?known.message+' Your prompt is preserved.':failure instanceof Error?(/^(?:failed to fetch|networkerror when attempting to fetch resource\.?|load failed)$/i.test(failure.message)?'DATUMM could not be reached.':failure.message)+' Your prompt is preserved; check the saved task before retrying.':'DATUMM could not start this task. Your prompt is preserved; check whether another task is active.');
   pendingSubmission.current=null;
  }finally{if(recoveryEpoch.current===epoch)setAdmissionPending(false);}
  // Only this call's own submission says whether a turn started; early returns are falsy.
  return submission.runStarted;
 };

 const submit=async(text=prompt,recipe=false,override?:Mode,variableSelection?:VariableBinding,draftFingerprint?:string)=>{
  if(run?.data.agent_design&&(override??mode)==='build'&&!(run.status==='needs_input'&&run.data.agent_question)){
   await withSelectionMutation(async()=>{if(drawingIdentity(currentRun.current?.currentPlanRef)!==drawingIdentity(run.currentPlanRef)||drawingIdentity(currentDrawing.current)!==drawingIdentity(designVersion))return;await submitCore(text,recipe,override,variableSelection,draftFingerprint);});return;
  }
  return await submitCore(text,recipe,override,variableSelection,draftFingerprint);
 };

 // Queue release and retry send through the normal path with the model chosen for that prompt.
 const sendWith=async(text:string,sendModel:string,sendMode:Mode)=>{modelOverride.current=sendModel;try{return Boolean(await submit(text,false,sendMode));}finally{modelOverride.current=null;}};
 const lastPrompt=run?.conversation?.at(-1)?.prompt??'';
 const retryModel=run&&retryableFailure(run,workspaceAccountKey)&&lastPrompt?alternateModel(chatModels,run.model,runtimeConfig?.defaultModel):null;
 const retryOnModel=async()=>{if(!run||!retryModel)return;modelPreferenceInitialized.current=true;setModel(retryModel);await sendWith(lastPrompt,retryModel,run.mode==='plan'?'plan':'ask');};

  const queueAction=async(action:'resume'|'remove'|'edit'|'stop',item?:typeof promptQueue[number])=>{
   if(!run||actionBusy||cancelPendingRef.current||!scopeCurrent(actionScope)||currentRun.current?.id!==run.id)return;
   const epoch=recoveryEpoch.current;if(lifecycleAction.current?.epoch===epoch)return;
   const token={epoch};lifecycleAction.current=token;
   const current=()=>recoveryEpoch.current===epoch&&scopeCurrent(actionScope)&&currentRun.current?.id===run.id;
   if(action==='edit'&&item){
    if(promptValue.current.length){lifecycleAction.current=null;setError('Your current draft is preserved. Clear it before editing a queued prompt.');return;}
    setPrompt(item.prompt);setMode(item.mode);setModel(item.model);setReasoningEffort(item.reasoningEffort);
   }
   setActionBusy(true);setError('');
   try{
    if(action==='stop')await api(`tasks/${run.id}/cancel`,'POST',{});
    else if(action==='resume')await api(`tasks/${run.id}/queue/resume`,'POST',{});
    else if(item)await api(`tasks/${run.id}/queue/${item.id}`,'DELETE');
    if(!current())return;
    const value=await api<Run>(`tasks/${run.id}`);if(current()&&value.id===run.id)setRun(value);
   }catch(failure){if(current())setError(action==='edit'?'Your draft is preserved. Check the queue before sending; removal could not be confirmed.':(failure as Error).message);}finally{if(lifecycleAction.current===token)lifecycleAction.current=null;if(current())setActionBusy(false);}
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
 const selectAlternative=async(selection:AlternativeSelection)=>{
  if(!scopeCurrent(actionScope))return;
  await withSelectionMutation(async()=>{
  const token={...workspaceGuard.current},taskId=runId,briefId=run?.data.agent_design?.briefId,candidate=selection.plan,baseRef=drawingIdentity(run?.currentPlanRef),baseDrawing=drawingIdentity(designVersion);
  const valid=()=>{const selected=currentRun.current,design=selected?.data.agent_design;return scopeCurrent(token)&&selection.scope.key===token.key&&selection.taskId===taskId&&selected?.id===taskId&&drawingIdentity(selected.currentPlanRef)===baseRef&&drawingIdentity(currentDrawing.current)===baseDrawing&&Boolean(design&&design.briefId===briefId&&selection.briefId===briefId&&design.candidates.some(row=>row.planId===candidate.planId&&row.version===candidate.version&&row.fingerprint===candidate.fingerprint));};
  if(!valid()||selectionBlocked())return;
  const epoch=++reviewEpoch.current;setActionBusy(true);setSelectionIssue({key:selectionKey,message:''});
  const owned=()=>scopeCurrent(token)&&epoch===reviewEpoch.current&&currentRun.current?.id===taskId;
  const current=()=>owned()&&valid();
  try{
   const version=await api<VariableVersion>(`variable/plans/${candidate.planId}/versions/${candidate.version}`);
   if(!current())return;
   if(version.planId!==candidate.planId||version.version!==candidate.version||version.fingerprint!==candidate.fingerprint)throw new Error('This concept changed; reload alternatives.');
   const review=await api<{selectionRevision:number}>(`variable/briefs/${briefId}/alternatives`);
   if(!current())return;
   if(!briefId||!await claimSelectionMarker(selectionStorage(),selectionWebLocks(),workspaceAccountKey,taskId,briefId,candidate))throw new Error('Selection was not sent because browser storage or locking is unavailable, or another selection is pending. Check storage and the saved selection before trying again.');
   const unresolved={plan:candidate,version,message:'Selection could not be confirmed. Check the saved selection before approval.'};selectionLocks.current.set(selectionKey,unresolved);setUncertainSelections(previous=>({...previous,[selectionKey]:unresolved}));
   if(!current()){if(await releaseSelectionMarker(selectionStorage(),selectionWebLocks(),workspaceAccountKey,taskId,briefId,candidate)){selectionLocks.current.delete(selectionKey);setUncertainSelections(previous=>{const next={...previous};delete next[selectionKey];return next;});}return;}
   const receipt=await api<{selected:{planId:string;version:number;fingerprint:string}}>(`variable/briefs/${briefId}/selection`,'POST',{planId:candidate.planId,version:candidate.version,fingerprint:candidate.fingerprint,expectedSelectionRevision:review.selectionRevision});
   if(!current())return;
   const refreshed=await api<Run>('tasks/'+taskId);
   if(!current()||refreshed.id!==taskId)return;
   if(drawingIdentity(receipt.selected)!==drawingIdentity(candidate)||drawingIdentity(refreshed.currentPlanRef)!==drawingIdentity(candidate)||refreshed.data.agent_design?.briefId!==briefId||!refreshed.data.agent_design.candidates.some(row=>drawingIdentity(row)===drawingIdentity(candidate))||(refreshed.taskVersion??0)<(currentRun.current?.taskVersion??0)||(refreshed.eventCursor??0)<(currentRun.current?.eventCursor??0))throw new Error('Saved selection is not yet confirmed.');
   if(!await releaseSelectionMarker(selectionStorage(),selectionWebLocks(),workspaceAccountKey,taskId,briefId,candidate,current))throw new Error('Saved selection is confirmed but the safety marker could not be cleared. Check it again.');
   selectionLocks.current.delete(selectionKey);setUncertainSelections(previous=>{const next={...previous};delete next[selectionKey];return next;});
   if(!current())return;
   if(!designVersion||designVersion.planId!==version.planId||designVersion.version!==version.version||designVersion.fingerprint!==version.fingerprint)setDrawingStyle('linework');
   setDesignVersion(version,token);setCompareVersion(null);setRun(refreshed);
  }catch(e){if(current()&&!selectionLocks.current.has(selectionKey))setSelectionIssue({key:selectionKey,message:(e as Error).message});}finally{if(owned())setActionBusy(false);}
  });
 };
 const reconcilePlanSelection=async()=>{
  const pending=selectionLocks.current.get(selectionKey),token={...workspaceGuard.current},taskId=runId,briefId=run?.data.agent_design?.briefId;if(!pending||!taskId)return;
  await withSelectionMutation(async()=>{
  if(selectionLocks.current.get(selectionKey)!==pending)return;
  const epoch=++reviewEpoch.current,baseRef=drawingIdentity(run?.currentPlanRef),baseVersion=run?.taskVersion,baseCursor=run?.eventCursor;
  const owned=()=>scopeCurrent(token)&&reviewEpoch.current===epoch&&currentRun.current?.id===taskId;
  const current=()=>owned()&&currentRun.current?.data.agent_design?.briefId===briefId&&drawingIdentity(currentRun.current?.currentPlanRef)===baseRef&&currentRun.current?.taskVersion===baseVersion&&currentRun.current?.eventCursor===baseCursor&&selectionLocks.current.get(selectionKey)===pending;setActionBusy(true);
  try{const saved=await api<Run>('tasks/'+taskId);if(!current())return;if(saved.id!==taskId||saved.data.agent_design?.briefId!==briefId||!saved.data.agent_design?.candidates.some(row=>drawingIdentity(row)===drawingIdentity(pending.plan))||drawingIdentity(saved.currentPlanRef)!==drawingIdentity(pending.plan)||(saved.taskVersion??0)<(currentRun.current?.taskVersion??0)||(saved.eventCursor??0)<(currentRun.current?.eventCursor??0))throw new Error('The saved task has not confirmed the requested selection.');
   const version=pending.version??await api<VariableVersion>(`variable/plans/${encodeURIComponent(pending.plan.planId)}/versions/${pending.plan.version}`);if(!current())return;if(drawingIdentity(version)!==drawingIdentity(pending.plan))throw new Error('The saved drawing identity changed.');
   if(!briefId||!await releaseSelectionMarker(selectionStorage(),selectionWebLocks(),workspaceAccountKey,taskId,briefId,pending.plan,current))throw new Error('The safety marker could not be cleared. Check the saved selection again.');
   const stillCurrent=current();
   selectionLocks.current.delete(selectionKey);setUncertainSelections(previous=>{const next={...previous};delete next[selectionKey];return next;});
   if(!stillCurrent)return;setDesignVersion(version,token);setRun(saved);setDrawingError('');
  }catch(e){if(current()){const next={...pending,message:(e as Error).message};selectionLocks.current.set(selectionKey,next);setUncertainSelections(previous=>({...previous,[selectionKey]:next}));}}finally{if(owned())setActionBusy(false);}
  },true);
 };
 const drawingIdentity=(value:{planId:string;version:number;fingerprint:string}|null|undefined)=>value?JSON.stringify([value.planId,value.version,value.fingerprint]):'';
 const beginDrawingReview=(candidate=selectedDesignCandidate)=>{
  const scope={...workspaceGuard.current},epoch=++reviewEpoch.current,taskId=run?.id,briefId=run?.data.agent_design?.briefId;
  const drawing=drawingIdentity(designVersion),ref=drawingIdentity(run?.currentPlanRef),candidateKey=drawingIdentity(candidate);
  const owned=()=>scopeCurrent(scope)&&reviewEpoch.current===epoch&&currentRun.current?.id===taskId;
  const current=()=>{const selected=currentRun.current,design=selected?.data.agent_design;return owned()&&design?.briefId===briefId&&drawingIdentity(currentDrawing.current)===drawing&&drawingIdentity(selected?.currentPlanRef)===ref&&(!candidateKey||candidateKey===ref||Boolean(design?.candidates.some(row=>drawingIdentity(row)===candidateKey)));};
  return {owned,current};
 };
 const compareDrawing=async(requested?:'previous'|'alternative')=>{
  if(!designVersion||!run?.data.agent_design)return;
  const {owned,current}=beginDrawingReview(),request=reviewEpoch.current,key=comparisonKey;
  const kind=requested??(designVersion.version>1?'previous':'alternative');
  const alternative=run.data.agent_design.candidates.find(c=>c.planId!==designVersion.planId);
  const other=kind==='previous'?(designVersion.version>1?{planId:designVersion.planId,version:designVersion.version-1}:null):alternative;
  const known=other?run.data.agent_design.candidates.find(c=>c.planId===other.planId&&c.version===other.version):undefined;
  const stillCurrent=()=>current()&&(!known||Boolean(currentRun.current?.data.agent_design?.candidates.some(c=>c.planId===known.planId&&c.version===known.version&&c.fingerprint===known.fingerprint)));
  setComparisonRecord(previous=>({key,request,loading:true,error:'',result:previous.key===key?previous.result:null}));setActionBusy(true);
  try{
   if(!other)throw Error(kind==='previous'?'No previous version was requested because this is version 1.':'No other loaded alternative is available.');
   const prior=await api<VariableVersion>(`variable/plans/${other.planId}/versions/${other.version}`);
   if(!stillCurrent())return;
   if(prior.planId!==other.planId||prior.version!==other.version||(known&&prior.fingerprint!==known.fingerprint))throw Error('Comparison drawing identity changed.');
   const query=new URLSearchParams({leftPlanId:prior.planId,leftVersion:String(prior.version),rightPlanId:designVersion.planId,rightVersion:String(designVersion.version)});
   const diff=await api<{changedRooms:{key:string}[];siteChanged:boolean}>(`variable/diff?${query}`);
   if(!stillCurrent())return;
   setComparisonRecord(previous=>previous.key===key&&previous.request===request?{...previous,result:{kind,version:prior,diff:`${diff.changedRooms.length} rooms changed${diff.siteChanged?' · footprint/entry changed':''}.`}}:previous);
  }catch(e){if(stillCurrent())setComparisonRecord(previous=>previous.key===key&&previous.request===request?{...previous,error:(e as Error).message}:previous);}finally{setComparisonRecord(previous=>previous.key===key&&previous.request===request?{...previous,loading:false}:previous);if(owned())setActionBusy(false);}
 };
 const planEditVisible=featureEnabled(capabilities,'planEditing')&&Boolean(run?.data.agent_design&&designVersion&&run.currentPlanRef?.source==='variable'&&run.currentPlanRef.planId===designVersion.planId&&editablePlan(designVersion.graph));
 const planEditEarlier=planEditVisible&&designVersion&&run?.currentPlanRef&&designVersion.version<run.currentPlanRef.version?run.currentPlanRef.version:0;
 const planEditReason=!planEditVisible?'':planEditEarlier?`This is an earlier saved version. Open Version ${planEditEarlier} to edit.`:selectionUncertain?'Check the saved selection before editing.':!drawingCurrent||drawingError||drawingLoading?'Open the current drawing before editing.':!run||!['completed','failed','cancelled','interrupted'].includes(run.status)||hasPendingQuestion(run)?'Finish the active work before editing.':actionBusy?'Another action is running.':'';
 const planEditState=usePlanEdit({allowed:planEditVisible&&!planEditReason,designVersion,run:run??null,runId,guard:workspaceGuard,scopeCurrent,withSelectionMutation,api,currentRun,setRun,setActionBusy,setDesignVersion,clearComparison:()=>setCompareVersion(null),clearSelection:()=>setSelectedDesignElement('')});
 const planEdit={visible:planEditVisible,reason:planEditState.busy?'':planEditReason,earlierOf:planEditEarlier||0,...planEditState};
 const acceptDrawing=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!drawingCurrent||drawingError||!run?.currentPlanRef||!designVersion)return;
  await withSelectionMutation(async()=>{
  const {owned,current}=beginDrawingReview();
  setActionBusy(true);try{
   const binding=await bindCurrentVariable(current);if(!current())return;
   await taskCommand({type:'accept_plan',plan:{schemaVersion:2,source:'variable',briefId:binding.briefId,planId:binding.planId,version:binding.version,fingerprint:binding.fingerprint},acceptedAssumptions:reviewAssumptions});
   if(!current())return;
   const saved=await api<Run>('tasks/'+run.id);if(!current()||saved.id!==run.id)return;setRun(saved);
  }catch(e){if(current())setDrawingError((e as Error).message);}finally{if(owned())setActionBusy(false);}
  });
 };
 const switchDrawingToBuild=async()=>{if(!scopeCurrent(actionScope)||selectionBlocked()||!drawingCurrent||drawingError||drawingLoading||!run)return;await withSelectionMutation(async()=>{if(drawingIdentity(currentRun.current?.currentPlanRef)!==drawingIdentity(run.currentPlanRef)||drawingIdentity(currentDrawing.current)!==drawingIdentity(designVersion))return;const {owned,current}=beginDrawingReview();setActionBusy(true);try{await taskCommand({type:'change_mode',mode:'build'});if(!current())return;const saved=await api<Run>('tasks/'+run.id);if(!current()||saved.id!==run.id)return;setMode('build');setRun(saved);setBuildSetupOpen(true);if(planAccepted)await reviewPlacement();}catch(e){if(current())setDrawingError((e as Error).message);}finally{if(owned())setActionBusy(false);}});};
 const bindCurrentVariable=async(current:()=>boolean):Promise<VariableBinding>=>{
   if(selectionBlocked())throw new Error('Check the saved selection before approval.');
   if(!run?.data.agent_design)throw new Error('Open a concept first.');
   const design=run.data.agent_design;
   const candidate=selectedDesignCandidate;
   if(!candidate)throw new Error('The selected concept version is unavailable. Reload the concept and review it again.');
   if(designVersion&&drawingIdentity(candidate)!==drawingIdentity(designVersion))throw new Error('The selected concept differs from the displayed drawing. Reload and review it again.');
   const review=await api<{selectionRevision:number}>(`variable/briefs/${design.briefId}/alternatives`);
   if(!current())throw new Error('The selected drawing changed. Review it again.');
   const choice=await api<{selectionRevision:number;selected:{planId:string;version:number;fingerprint:string}}>(`variable/briefs/${design.briefId}/selection`,'POST',{
    planId:candidate.planId,version:candidate.version,fingerprint:candidate.fingerprint,expectedSelectionRevision:review.selectionRevision});
   if(!current())throw new Error('The selected drawing changed. Review it again.');
   if(choice.selected.planId!==candidate.planId||choice.selected.version!==candidate.version||choice.selected.fingerprint!==candidate.fingerprint)throw new Error('Plan selection changed; review it again.');
   return {briefId:design.briefId,planId:candidate.planId,version:candidate.version,
    fingerprint:candidate.fingerprint,selectionRevision:choice.selectionRevision};
 };
 const buildVariable=async(placement=confirmedPlacement)=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!run?.data.agent_design)return;
  await withSelectionMutation(async()=>{
  const {owned,current:currentDrawingReview}=beginDrawingReview(),device=currentDevice.current,deviceGeneration=placementDeviceEpoch.current.generation;
  const current=()=>currentDrawingReview()&&currentDevice.current===device&&placementDeviceEpoch.current.generation===deviceGeneration;
  setActionBusy(true);setError('');
  try{
   const binding=await bindCurrentVariable(current);if(!current())return;
   if(!planAccepted||run.mode!=='build')throw Error('Accept this exact plan and switch to Build first.');
   if(placementTask!==run.id||!placement)throw Error('Review and confirm native placement first.');
   await taskCommand({type:'prepare_build',deviceId:deviceId||run.device_id,selectionRevision:binding.selectionRevision,placement});
   if(!current())return;
   const saved=await api<Run>('tasks/'+run.id);if(!current()||saved.id!==run.id)return;setRun(saved);
   setBuildSetupOpen(false);
  }catch(e){if(current())setError((e as Error).message);}finally{if(owned())setActionBusy(false);}
  });
 };
 const reviewPlacement=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!run)return;
  const device=deviceId||run.device_id;
  if(!device){setError('Revit is not connected. Open Revit, connect the DATUMM plugin, then choose the placement again.');return;}
  const scope={...workspaceGuard.current},epoch=++reviewEpoch.current,taskId=run.id,deviceGeneration=placementDeviceEpoch.current.generation;
  const owned=()=>scopeCurrent(scope)&&reviewEpoch.current===epoch&&currentRun.current?.id===taskId;
  const current=()=>owned()&&currentDevice.current===device&&placementDeviceEpoch.current.generation===deviceGeneration;
  setActionBusy(true);setError('');setConfirmedPlacement(null);setPlacementScope(null);
  try{const context=await api<PlacementContext>(`tasks/${taskId}/build-context?deviceId=${encodeURIComponent(device)}`);if(!current())return;setPlacementContext(context);setPlacementTask(taskId);setPlacementScope({...scope,device,deviceGeneration});setPlacementView('');}
  catch(e){if(current())setError((e as Error).message);}finally{if(owned())setActionBusy(false);}
 };
 const confirmPlacement=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked())return;
  const view=placementContext?.plans.find(v=>v.id===placementView);
  if(!placementContext||!view||[placementX,placementY,placementRotation].some(v=>!v.trim()||!Number.isFinite(Number(v)))){setError('Choose the native plan view and enter origin X/Y in mm and rotation explicitly.');return;}
  const x=Number(placementX),y=Number(placementY),rotation=Number(placementRotation);
  if(Math.abs(x)>900000||Math.abs(y)>900000||rotation<0||rotation>=360){setError('Origin must be within 900,000 mm; rotation must be 0 to less than 360 degrees.');return;}
  const placement:NativePlacement={schemaVersion:2,sessionId:placementContext.sessionId,documentId:placementContext.documentId,revision:placementContext.revision,levelId:view.levelId,viewId:view.id,originXmm:x,originYmm:y,rotationDegrees:rotation};
  setConfirmedPlacement(placement);setError('');await buildVariable(placement);
 };
 const buildLegacy=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!run?.currentPlanRef||run.currentPlanRef.source==='variable')return;
  setActionBusy(true);setError('');
  try{
   await taskCommand({type:'accept_plan',plan:run.currentPlanRef});
   await taskCommand({type:'change_mode',mode:'build'});setMode('build');
   await taskCommand({type:'prepare_build',deviceId:deviceId||run.device_id});
   setRun(await api<Run>('tasks/'+run.id));
  }catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };
 const grantVariable=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!selectedDevice?.online||revitSessions!==1)return;
  await withSelectionMutation(async()=>{
  const {owned,current:currentDrawingReview}=beginDrawingReview(),device=selectedDevice.id,deviceGeneration=placementDeviceEpoch.current.generation;
  const current=()=>currentDrawingReview()&&currentDevice.current===device&&placementDeviceEpoch.current.generation===deviceGeneration;
  setActionBusy(true);setError('');
  try{
   const binding=await bindCurrentVariable(current);if(!current())return;
   await api(`devices/${device}/agent-control`,'POST',{...binding,maxBuilds:1});
   if(!current())return;
   await refresh();
  }catch(e){if(current())setError((e as Error).message);}finally{if(owned())setActionBusy(false);}
  });
 };
 const revokeVariableGrant=async()=>{
  if(!selectedDevice)return;
  setActionBusy(true);setError('');
  try{await api(`devices/${selectedDevice.id}/agent-control`,'DELETE');await refresh();}
  catch(e){setError((e as Error).message);}finally{setActionBusy(false);}
 };


 const closeMobileNav=()=>{if(window.matchMedia('(max-width:899px)').matches)setLeft(false);};
 const newTask=(projectId='')=>{if(mediaBusy)return;setStudioView('workspace');setWorkspacePane('chat');setCanvasOpen(false);setWorkAreaState({key:workspaceScopeInput.key,section:'design',properties:false});closeProperties();setPlanningGoalOpen(false);setNewProject(projectId);questionObserver.current?.abort();recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setActionBusy(false);setCompareVersion(null);setDrawingError('');const url=new URL(window.location.href);url.searchParams.delete('task');window.history.replaceState(null,'',url);pendingSubmission.current=null;transportMessageOwner.current=null;void stop();submissionKey.current=null;commandRetry.current.clear();setRun(null);setRunId('');setMessages([]);setAdmissionPending(false);setDesignVersion(null);setError('');displayPrompt(promptDrafts.current.get(projectId?'new:'+projectId:'new'));setUseCurrentModel(false);closeMobileNav();};

 const selectRun=(value:Run)=>{if(mediaBusy)return;setStudioView('workspace');setWorkspacePane('chat');setCanvasOpen(false);setWorkAreaState({key:workspaceScopeInput.key,section:'design',properties:false});closeProperties();setPlanningGoalOpen(false);displayPrompt(promptDrafts.current.get(value.id));questionObserver.current?.abort();recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setActionBusy(false);setCompareVersion(null);setDrawingError('');pendingSubmission.current=null;transportMessageOwner.current=null;submissionKey.current=null;void stop();commandRetry.current.clear();setRun(value);setRunId(value.id);setMode(value.mode);setModel(value.model);setReasoningEffort(value.reasoningEffort??'high');setUseCurrentModel((value.data as Run['data']&{model_context_requirement?:string}).model_context_requirement==='read');setDesignVersion(null);setMessages([]);setAdmissionPending(false);closeMobileNav();void refreshSelectedTask(value.id,{readBase:value});};
  const selectRunRef=useRef(selectRun);selectRunRef.current=selectRun;
  useEffect(()=>window.desktop?.onNavigateTask(id=>{const epoch=++recoveryEpoch.current;void api<Run>('tasks/'+id).then(value=>{if(epoch===recoveryEpoch.current)selectRunRef.current(value);}).catch(e=>{if(epoch===recoveryEpoch.current)setError((e as Error).message);});}),[]);

 // True once the service accepted the command, so the queue's stop knows it was not skipped.
 const act=async(action:string)=>{if(!run||actionBusy||cancelPendingRef.current||!scopeCurrent(actionScope)||currentRun.current?.id!==run.id)return false;
  const epoch=recoveryEpoch.current;if(lifecycleAction.current?.epoch===epoch)return false;
  const token={epoch};lifecycleAction.current=token;let accepted=false;
  const current=()=>recoveryEpoch.current===epoch&&scopeCurrent(actionScope)&&currentRun.current?.id===run.id;
  setActionBusy(true);setError('');try{
   if(action==='resume'||action==='refresh-proposal'){
    const proposal=run.data.proposal;if(!proposal)throw new Error('Reload the exact native proposal.');
    await taskCommand({type:action==='resume'?'approve_exact_proposal':'refresh_exact_proposal',proposalId:proposal.proposalId,approvalHash:proposal.approvalHash,documentId:proposal.documentId,revision:proposal.revision});
   }else if(['pause','continue','cancel'].includes(action))await taskCommand({type:action});
   else await api('runs/'+run.id+'/'+action,'POST');
   accepted=true;if(!current())return true;
   const value=await api<Run>('runs/'+run.id);if(!current()||value.id!==run.id)return true;setRun(value);await refresh();
  }catch(e){if(current())setError((e as Error).message);}finally{if(lifecycleAction.current===token)lifecycleAction.current=null;if(current())setActionBusy(false);}
  return accepted;};

 const pair=async()=>{setError('');try{const result=await api<{code:string}>('pairing','POST');setPairing(result.code);}catch(e){setError((e as Error).message);}};

 const revoke=async(id:string)=>{try{await api('devices/'+id,'DELETE');if(deviceId===id)setDeviceId('');await refresh();}catch(e){setError((e as Error).message);}};

 const setControl=async(device:Device)=>{if(!scopeCurrent(actionScope)||!device.fullControl&&selectionBlocked())return;setActionBusy(true);setError('');try{await api('devices/'+device.id+'/control',device.fullControl?'DELETE':'POST');await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};

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

 const openStudioView=(view:'activity'|'schedules')=>{setWorkAreaState(previous=>({...previous,section:'activity'}));openWorkspaceView(view,{setStudioView,setWorkspacePane,setLeft,narrow:window.matchMedia('(max-width:899px)').matches});setCanvasOpen(false);closeProperties();requestAnimationFrame(()=>document.querySelector<HTMLElement>('#workspace-drawing .studio-page')?.focus());};
 const toggleLeft=()=>setLeft(value=>!value);

 const scene=workspaceScene(runId,run?.id,admissionPending);
 const hasContent=Boolean(runId);

 const unreadIds=new Set(runs.filter(item=>isUnread(item,seen,runId)).map(item=>item.id));
 const filteredChats=runs.filter(item=>(!workflowFilter||workflowState(item).kind===workflowFilter&&!item.data.organized_done)&&item.title.toLowerCase().includes(search.toLowerCase()));
 const defaultProject=projects.find(project=>project.isDefault);
 const currentProject=projects.find(project=>project.id===(run?.projectId||newProject)&&!project.isDefault);
 const orderedProjects=projects.filter(project=>!project.isDefault).sort((a,b)=>(projectOrder.includes(a.id)?projectOrder.indexOf(a.id):projectOrder.length)-(projectOrder.includes(b.id)?projectOrder.indexOf(b.id):projectOrder.length));
 const reviewScroll=useRef<StickToBottomContext|null>(null);
 const focusReview=(selector:string)=>{setCanvasOpen(false);reviewFocus(selector,{setStudioView,setWorkspacePane,closeProperties,reviewScroll,requestFrame:(callback:FrameRequestCallback)=>{const token={...workspaceGuard.current};return requestAnimationFrame(time=>{if(scopeCurrent(token))callback(time);});}});};
 const continueDesignBuild=async()=>{
  if(!scopeCurrent(actionScope)||selectionBlocked()||!run)return;
  const current=()=>scopeCurrent(actionScope)&&currentRun.current?.id===run.id&&(!run.data.agent_design||(drawingIdentity(currentRun.current.currentPlanRef)===drawingIdentity(run.currentPlanRef)&&drawingIdentity(currentDrawing.current)===drawingIdentity(designVersion)));
  const proceed=async()=>{if(!current())return;setActionBusy(true);setError('');
   try{if(queueData?.design?.selected||queueData?.native_build){if(run.mode!=='build'&&!queueData?.native_build){await taskCommand({type:'change_mode',mode:'build'});if(!current())return;const saved=await api<Run>('tasks/'+run.id);if(!current()||saved.id!==run.id)return;setRun(saved);}setMode('build');}openProperties();focusReview(queueData?.native_build?'[aria-label="Native build review"]':queueData?.design?.selected?'[aria-label="Accepted design placement"]':'[aria-label="Validated design preview"]');}
   catch(error){if(current())setError((error as Error).message);throw error;}finally{if(scopeCurrent(actionScope))setActionBusy(false);}
  };
  if(run.data.agent_design)await withSelectionMutation(proceed);else await proceed();
 };
 const designDraftKey=run&&queueData?.design?run.id+':'+queueData.design.brief.briefId:'';
  const askFromCanvas=(text:string)=>{setPrompt(previous=>appendViewportPrompt(previous,text));setCanvasOpen(false);setWorkspacePane('chat');closeProperties();requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus());};
 const nativeAction=async(action:'approve'|'reconcile'|'show'|'select')=>{
       if(!scopeCurrent(actionScope))throw new Error('Task view changed. Review the current task again.');
       if(action==='approve'&&selectionBlocked())throw new Error('Check the saved selection before approval.');
       if(cancelPendingRef.current)throw new Error('Stop requested. Wait for the task status before continuing.');
       if(!run||!queueData?.native_build)return;setActionBusy(true);
       try{if(!window.desktop)throw new Error('Open the desktop to approve native operations.');const row=queueData.native_build;const result=await window.desktop.nativeBuildAction(run.id,action,{expectedTaskVersion:run.taskVersion,proposal:{proposalId:row.proposal.proposalId,approvalHash:row.proposal.approvalHash,documentId:row.changes.documentId,expectedRevision:row.changes.expectedRevision}});setRun(result as Run);}catch(error){try{setRun(await api<Run>(`tasks/${run.id}`));}catch{}throw error;}finally{setActionBusy(false);}
      };
 const designTurn=run?.data.designConversationIndex??savedTurns.findLast(turn=>turn.result?.design?.brief?.version===queueData?.design?.brief.version)?.conversationIndex??0;
 const nativeTurn=run?.data.nativeBuildConversationIndex??designTurn;
  const visiblePrompt=splitViewportPrompt(prompt);
 const workflowNoticeKey=JSON.stringify([run?.id,run?workflowState(run).label:'',run?.currentPlanRef?.fingerprint,queueData?.native_build?.state,queueData?.native_build?.proposal?.proposalId,buildStep]);
  // Geometry arriving never changes the user's selected pane or inspector.
  const selectedActivityRun=runs.find(item=>item.id===activitySelection)??run??runs[0];
  const activityRun=selectedActivityRun?.id===run?.id?run:selectedActivityRun;
  const activityRuns=runs.filter(item=>activityFilter==='all'||(activityFilter==='done'?item.status==='completed':workflowState(item).kind===activityFilter));
  const activityView=activityRun?latestTaskActivity(activityRun,activityRun.id===run?.id?events:activityRun.events.map(displayEvent)):null;
  const currentActivity=run?latestTaskActivity(run,events):null;

 const draftSaveNotice=prompt&&draftSaveStatus==='unavailable'?'This draft is kept in this tab. Browser storage is unavailable; copy your text before reloading.':draftSaveStatus==='memory'&&draftAccountKey&&prompt?'This draft is kept in this tab because it falls outside browser draft limits. Copy your text before reloading.':'';
 const hostedQueue=usePromptQueue({accountKey:workspaceAccountKey,taskId:run?.id??null,status:run?.status,active:!liveRuntime&&!desktopPreview&&!offlineFixture&&queueAllowed(run),models:chatModels,model,mode:mode==='plan'?'plan':'ask',idle:!busy,lastPrompt,send:sendWith,stop:()=>act('cancel')});
 return {hostedQueue,retryModel,retryOnModel,liveSubmission,displayScope,workAreaView,scene,settingsTarget,prepareProjectBriefReference,prepareBriefUpdate,preparePlanRevision,planRevisionBlockedReason,selectionError,selectionUncertain,reconcilePlanSelection,comparisonError,comparisonLoading,comparisonKind,workspaceScopeInput,workAreaSection,propertiesOpen,selectWorkAreaSection,openProperties,closeProperties,effectiveLayout,layout,serviceError,draftSaveNotice,openStudioView,workspacePane,setWorkspacePane,projectsSupported:projectsState==='supported',projectsUnknown:projectsState==='unknown',chatMenuUnsupported,unreadIds,renameChat,moveChat,createProject,archiveProject,projects,runId,mediaBusy,actionBusy,selectRun,dialogTrigger,updateHistory,setProjectContextOpen,setDeleteTarget,left,viewportReady,setLeft,panelWidths,resizePanel,toggleLeft,newTask,search,setSearch,studioView,setStudioView,runs,historyView,filteredChats,desktopAvailable,orderedProjects,collapsedProjects,setCollapsedProjects,setRenameTitle,setRenameTarget,setProjectOrder,setWorkflowFilter,workflowFilter,defaultProject,changeSettingsOpen,authConfigured,setDeviceDialog,setHistoryView,setDeletePhrase,setDeleteAllOpen,liveRuntime,capabilities,desktopPreview,queueData,run,designDraftKey,placementDrafts,selectedSource,executing,cancelPending,setDesignHighlights,selectedDesignElement,setInspectedDesignFingerprint,model,askFromCanvas,setActionBusy,setRun,setPrompt,refresh,mode,continueDesignBuild,devices,setMode,focusReview,nativeAction,hasContent,reviewScroll,messages,traceTurns,nativeQuestions,savedTurns,nativeTodos,designTurn,nativeTurn,responseSummary,planningGoalOpen,recoveryEpoch,busy,savedSources,setSelectedSourceId,nativeContext,nativeContextError,commandExpected,taskCommand,proposalExpired,committedBuild,act,setAccessBatches,plannedAccessBatches,setAccessMargin,setAccessReview,setAccessDialog,setError,replyToQuestion,outcome,openCanvas,selectedDevice,buildLegacy,selectAlternative,drawingLoading,drawingError,drawingMissing,setDrawingRetry,designVersion,drawingCurrent,compareVersion,canvasInputEnabled,persistentProperties,setDrawingStyle,compareDrawing,planEdit,setCompareVersion,drawingStyle,designDiff,reviewAssumptions,planAccepted,acceptDrawing,switchDrawingToBuild,buildStep,revitSessions,placementTask,confirmedPlacement,buildVariable,setBuildSetupOpen,reviewPlacement,revokeVariableGrant,grantVariable,previewSvg,previewRooms,batchInProgress,batchProgressCount,partialGoal,verifiedBatchCount,verifiedCount,verifiedBreakdown,completedGoal,completedCriteria,checkpointFindings,submit,verifiedNativeBatches,confirmedAnnotationFailure,canRefreshFailedPreparation,canEndFailedPreparation,connected,workspaceReady,offlineFixture,dismissedWorkflow,workflowNoticeKey,setDismissedWorkflow,promptQueue,prompt,queueAction,runtimeConfig,messageError,blockedChat,setBlockedChat,connectionNotice,setConnectionNotice,useCurrentModel,setUseCurrentModel,draftReferences,commandsOpen,commandMatches,commandIndex,chooseCommand,visiblePrompt,setCommandIndex,setCommandsDismissed,sendShortcut,sourceKey,sources,setSources,setMediaBusy,buildUnavailable,chatModels,reasoningEffort,modelPreferenceInitialized,setModel,setReasoningEffort,queueMessage,providerStatus,contextView,hasRenderablePlan,activeDrawing,setSelectedDesignElement,plannedCandidate,separateNativeFollowup,contextTitle,previewLabel,previewCounts,currentActivity,eventDetail,exportItems,mcpToolsError,mcpTools,setSendShortcut,setCanvasInputEnabled,setPersistentProperties,needsAccountAdmission,accountStatus,accountStatusError,accountActionError,accountBusy,accountWorkspaceLoading,accountAction,settingsOpen,currentProject,deviceId,accountExpired,renameTarget,renameTitle,error,accessDialog,restoreDialogFocus,accessBatches,accessMargin,reviewTaskAccess,accessReview,enableTaskAccess,buildSetupOpen,placementContext,placementView,setPlacementView,setConfirmedPlacement,placementX,setPlacementX,placementY,setPlacementY,placementRotation,setPlacementRotation,confirmPlacement,activityView,activityFilter,setActivityFilter,activityRuns,activityRun,setActivitySelection,designHighlights,deviceDialog,setDeviceId,revoke,setControl,deleteTarget,removeTask,deleteAllOpen,deletePhrase,removeAllTasks,canvasOpen,setCanvasOpen,canvasTrigger,models,projectContextOpen,localConnections,setLocalConnections};
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
