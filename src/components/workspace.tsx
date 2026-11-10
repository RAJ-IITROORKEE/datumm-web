'use client';

import { settledPoll } from '@/lib/settled-poll.mjs';



import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useChat } from '@ai-sdk/react';

import { DefaultChatTransport } from 'ai';

import { Show, SignInButton, useClerk, useUser } from '@clerk/nextjs';

import { Archive, ArrowUp, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Download, Ellipsis, Expand, FileJson, FileSpreadsheet, FolderOpen, Folder, ChevronRight, Pencil, Image as ImageIcon, Layers3, Loader2, LogOut, MessageSquare, Minus, Monitor, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PencilRuler, Pin, Plus, RotateCcw, Search, Settings2, ShieldCheck, Square, Trash2, Unplug, Workflow, X, Box, LayoutTemplate, UserRound, ChevronsUpDown } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { Button } from '@/components/ui/button';
import { ModelPicker, type ReasoningEffort } from './model-picker';
import { DesktopTitlebar } from './desktop-titlebar';
import {PanelResize} from './panel-resize';
import {StudioProperties} from './studio-properties';
import './studio-workspace.css';
import {DemoMode} from './demo-mode';
import {PipelineTrace} from './pipeline-trace';
import {applyAppearance,parseAppearance,defaultAppearance} from '@/lib/appearance';
import { settingsSidebarTransition } from '@/lib/settings-navigation.mjs';
import { DesktopSettings } from './desktop-settings';
import { AccountAdmission, accountAdmissionState } from './account-admission';
import type { AuthStatus, ProviderStatus } from '@/lib/desktop-contract';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import {workflowState} from '@/lib/workflow-state';
import {studioPipeline} from '@/lib/studio-pipeline';
import type {StickToBottomContext} from 'use-stick-to-bottom';
import {PromptContent,ViewportReferences,splitViewportPrompt,withViewportReferences,appendViewportPrompt,hasPromptContent} from './prompt-content';
import {SavedTurnResult,type SavedTurn} from './saved-turn-result';
import {TaskOutcome} from './task-outcome';
import {PlanningGoalPanel,type PlanningGoal} from './planning-goal';
import { PlanCanvas, type DrawingVersion } from './plan-canvas';
import { DesignReview,candidateDrawing,type DesignPlacementDraft,type DesignRecord } from './design-review';
import { AgentQuestions, type AgentQuestion, type ReplyPayload } from './agent-questions';
import { OpenCodeQuestions, type OpenCodeQuestion } from './opencode-questions';
import { NativeBuildReview } from './native-build-review';
import { ProjectContext } from './project-context';
import { ComposerMedia,type ComposerSource } from './composer-media';
import { ActivitySummary, AgentActivity, WorkingIndicator, OpenCodeTodos, activityTurns, latestTaskActivity, type ToolEvidence, type RunManifest } from './agent-activity';
import { AgentScheduler, type SchedulerView } from './agent-scheduler';
import { AgentSpecialists, type SpecialistResult } from './agent-specialists';
import { AgentMemory, AgentLimit, ContextUsage, type TaskMemory, type ContextMetrics, type ContextUsageData } from './agent-memory';

import { cn } from '@/lib/utils';
import { emptyProjection, reduceProjection, type TaskEvent } from '@/lib/task-projection';
import installerRelease from '../../public/downloads/release.json';
import { DraftAssessmentDetails, type DraftAssessment, type NativeBatch } from './draft-assessment';
import { BuildComparisonCard, type BuildComparison, type BuildFeedback } from './build-comparison';
import { EvidenceResults, type ModelCoverage, type AdviceFinding, type RegulationResearch } from './evidence-results';
import { replaceTerminalCommand } from '@/lib/task-command';
import { chatStartFailure,savedTaskConnectionNotice } from '@/lib/chat-start';
import { planBuildStep } from '@/lib/plan-build-flow';



type Mode='ask'|'plan'|'build';
type RuntimeConfig={models:string[];defaultModel?:string;defaultReasoningEffort?:ReasoningEffort;agentEnabled?:boolean;runtime?:string;fixturePrompt?:string;supportedExports?:string[];nativeAvailable?:boolean;nativeReadAvailable?:boolean;authenticationRequired?:boolean};
type McpTool={name:string;description?:string;inputSchema?:{properties?:Record<string,{type?:string;description?:string;default?:unknown;enum?:unknown[];items?:{type?:string}}>;required?:string[]}};

type Device={id:string;name:string;online:boolean;fullControl:boolean;controlExpiresAt?:string|null;agentControl?:{binding:VariableBinding;expiresAt:string;remaining:number}|null};
type VariableBinding={briefId:string;planId:string;version:number;fingerprint:string;selectionRevision:number};
type VariableVersion=DrawingVersion;

type RunEvent=TaskEvent;

type DraftTask={fingerprint:string;requestedGoal?:string;previewSvg?:string|null;moveSemantics?:string;moveAnchors?:Record<string,{fromPoint:{x:number;y:number};toPoint:{x:number;y:number}}>;deletions?:{key:string;targetId:string;elements:{id:string;kind:string;name:string}[]}[];changes:{title:string;operations:({key:string;kind:string}&Record<string,unknown>)[]};successCriteria:string[]};
type AccessReview={runId:string;fingerprint:string;commits:number;scope:{documentId:string;levelId:string;operationKinds:string[];typeIds:string[];maxOperations:number;maxElements:number;maxTotalOperations?:number;maxTotalElements?:number;boundsMm:Record<'x'|'y',number[]>|null}};
type PlacementContext={schemaVersion:2;sessionId:string;documentId:string;revision:number;title:string;levels:{id:string;name:string;elevationMm:number}[];plans:{id:string;name:string;levelId:string}[]};
type NativePlacement={schemaVersion:2;sessionId:string;documentId:string;revision:number;levelId:string;viewId:string;originXmm:number;originYmm:number;rotationDegrees:number};
type PlanBinding={briefId:string;planId:string;version:number;fingerprint:string};
type ConceptImage={model:string;provenance:string;planBinding?:PlanBinding};
type InterpretedBrief={status:string;dimensions:{sourceText:string;role:string;widthMm:string|null;depthMm:string|null}[];values:Record<string,{value:string|number;provenance:string}>;unresolved:string[];assumptions:string[];program:{livingHall:boolean|null;kitchen:boolean|null};policy:{modelId:string;selection:string}|null};
type Run={projectId?:string;acceptance?:{plan:{planId:string;version:number;fingerprint:string};acceptedAssumptions:string[]}|null;id:string;taskVersion?:number;eventCursor?:number;executionId?:string;currentPlanRef?:{schemaVersion:2;source:'variable'|'legacy_plan'|'legacy_draft';briefId:string;planId:string;version:number;fingerprint:string}|null;conversation?:{prompt?:string;answer?:string;attachmentIds?:string[];nativeMessages?:{id:string;text:string;finish:string|null}[]}[];title:string;mode:Mode;model:string;reasoningEffort?:ReasoningEffort;status:string;modelOutcome?:{state:'no_write'|'pending'|'unknown'|'committed_unverified'|'committed_verified'|'rolled_back'|'failed';verified:boolean;present:number|null;missing:number|null;warnings:number|null;deleted?:number|null;verifiedBatches?:number;expectedBatches?:number;completedBuild?:boolean};device_id:string;pinned_at?:string;archived_at?:string;events:RunEvent[];data:{native_messages?:{id:string;text:string;finish:string|null}[];planning_goal?:PlanningGoal;designConversationIndex?:number;nativeBuildConversationIndex?:number;organized_done?:boolean;run_manifest?:RunManifest;project_context_shared?:boolean;agent_coverage?:ModelCoverage;agent_advice?:AdviceFinding[];agent_research?:RegulationResearch[];build_comparison?:BuildComparison;build_feedback?:BuildFeedback[];build_revision_count?:number;m09_revision?:{goalVersion:number};build_comparison_error?:string;annotation_view_review?:{viewId:string;name:string;reason:string};native_batches?:{verified:boolean;compiled:{counts:Record<string,number>};receipt:{state:string;elementIds:string[]}}[];build_type_review?:{requiredSizes:Record<string,unknown>[];loadedChoices:Record<string,unknown>[];resolution:string;revision:number};agent_scheduler?:SchedulerView|null;agent_specialists?:SpecialistResult[];agent_interpreted_brief?:InterpretedBrief;usage?:ContextUsageData;model_context_requirement?:'none'|'read'|'write';failure?:{schemaVersion:1;code:string;recoveryAction:string};agent_memory?:TaskMemory;agent_context?:ContextMetrics;agent_limit?:{reason:string;continuationAvailable:boolean};agent_quantity_pages?:{documentId:string;revision:number;scope:string;categories:string[];coverage:string;groups:unknown[]}[];agent_native_image?:{documentId:string;revision:number;viewName:string;width:number;height:number;provenance:string};agent_element_pages?:{scope:{categories:string[]};coverage:{status:string;returnedCount:number;totalCount:number};aggregates:{inspectedStraightWallProjectedLengthM:number};limitations:string[]}[];task_access?:{revoked:boolean;remaining:number;expiresAt:string};agent_execution?:boolean;agent_draft?:DraftTask;draft_task?:DraftTask;agent_question?:AgentQuestion;agent_reply_receipt?:{questionId:string;version:number};agent_task_plan?:{version:number;goal:string;successCriteria:string[];steps:{key:string;title:string;action:string;expectedResult:string;targetCategories?:string[]}[];progress:{key:string;status:string}[]};variable_selection?:{version:number};operation_id?:string;recovery?:{data?:{state?:string;sameDocument?:boolean;elements?:{missing?:boolean}[]|null}};concept?:ConceptImage;concept_error?:string;plan?:{version:number;fingerprint:string;brief:{bedrooms:number;bathrooms:number;entrance:string;site_width_mm:number;site_depth_mm:number;wall_height_mm:number}};agent_design?:{briefId:string;brief:{site:{widthMm:number;depthMm:number;entry:string};requirements:{key:string;kind:string}[]};candidates:{planId:string;version:number;fingerprint:string;score:number}[];assumptions:string[];diagnostics:string[];previewSvg:string;previewRooms:{name:string;expectedAreaM2:number}[];conceptImage?:ConceptImage};agent_inspection?:{documentId:string;revision:number;counts:Record<string,number>;rooms:{name:string;areaM2:number}[];coverage:{category:string;status:string;returnedCount:number;totalCount:number|null}[];limitations:string[]};agent_postbuild_inventory?:{documentId:string;revision:number;counts:Record<string,number>};agent_result?:{status:string;answer?:string;question?:string;goal?:string;documentId?:string;operationId?:string;verification?:string;criteria?:string[];assessment?:DraftAssessment;batchHistory?:NativeBatch[];changes?:Record<string,number>};selected_plan?:{version:number};snapshot?:{svg:string;revision:number;provenance:string};inventory?:{counts:Record<string,number>;rooms:{name:string;areaM2:number}[]};answer?:string;error?:string;context?:{title:string;activeViewName:string;documentId:string};compiled?:{svg?:string;changes?:{levelId:string;units:string;coordinateFrame:string;operations:({key:string;kind:string}&Record<string,unknown>)[]};counts:Record<string,number>;areas:{name:string;expectedAreaM2:number}[]};proposal?:{proposalId:string;expiresAt:string;documentId:string;approvalHash:string;revision:number;deletions?:{key:string;targetId:string;elements:{id:string;kind:string;name:string}[]}[]};receipt?:{state:string};verification?:{receipt?:{elementIds?:string[];warnings?:string[]};elements?:unknown[]}}};

function recoveryGuidance(action?:string){
 const guidance:Record<string,string>={review_progress:'Review the saved task progress before retrying.',narrow_scope:'Narrow the request, then start a focused task.',clarify_request:'Clarify the missing or repeated input before retrying.',retry_read:'Refresh the model read and review its coverage.',refresh_evidence:'Refresh current model evidence before continuing.',start_fresh_task:'Start a new task against the intended Revit document.',review_plan:'Review the current concept version before building.',prepare_new_proposal:'Prepare and review a new exact proposal.',check_operation:'Check the original Revit operation status before any further build.',retry_after_connection:'Check the Revit device and active session, then retry.',revise_scope:'Revise the request to fit the supported scope.',check_connection:'Check the Revit device and active session.',contact_support:'Contact the administrator to check task allowance configuration.',none:'No further action is required.'};
 return action?guidance[action]:undefined;
}

function taskStepCompleted(run:Run,step:NonNullable<Run['data']['agent_task_plan']>['steps'][number]):boolean{
 return run.data.agent_task_plan?.progress.some(row=>row.key===step.key&&row.status==='completed')??false;
}

const modes=[{id:'plan' as Mode,label:'Plan',icon:Workflow},{id:'build' as Mode,label:'Build',icon:PencilRuler},{id:'ask' as Mode,label:'Ask',icon:MessageSquare}];

const terminal=new Set(['completed','needs_input','failed','cancelled','awaiting_approval','interrupted','paused_limit','paused_recovery','reconciling']);
const completedDraftTitle=(title:string)=>title.replace(/^Dry-run:\s*/i,'').replace(/\s*[—–-]\s*Plan only\s*$/i,'');
const reviewCriteria=(criteria:string[])=>criteria.filter(item=>!(/\bPlan(?: and preview)? only\b|\bno native transaction\b|\bno model change is authorized\b/i.test(item)));

async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{

 const response=await fetch('/api/service/'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});

 const raw=await response.text();let data:unknown;
 try{data=JSON.parse(raw);}catch{data={detail:raw.slice(0,240)||'The request could not be completed.'};}
 if(!response.ok){
  const detail=data&&typeof data==='object'&&'detail' in data?data.detail:null;
   const failure=new Error(typeof detail==='string'?detail:detail&&typeof detail==='object'&&'message' in detail&&typeof detail.message==='string'?detail.message:detail&&typeof detail==='object'&&'error' in detail&&typeof detail.error==='string'?detail.error:'The request could not be completed.');
  Object.assign(failure,{status:response.status});throw failure;
 }
 return data as T;

}

function ProfileMenu({openConnections,openArchived,confirmDeleteAll}:{openConnections:()=>void;openArchived:()=>void;confirmDeleteAll:()=>void}){
 const {user}=useUser(),{signOut}=useClerk();
 return <div className="profile-row"><img className="profile-avatar" src={user?.imageUrl} alt=""/><span className="profile-name">{user?.fullName||user?.firstName||user?.username||'Your account'}</span><DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button className="icon-button" aria-label="Account settings"><Settings2 size={17}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu account-menu" side="top" align="end" sideOffset={9}><DropdownMenuPrimitive.Item onSelect={openArchived}><Archive size={15}/> Archived chats</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={openConnections}><Monitor size={15}/> Connections</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Separator/><DropdownMenuPrimitive.Item className="danger-item" onSelect={confirmDeleteAll}><Trash2 size={15}/> Delete all chats</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>void signOut()}><LogOut size={15}/> Sign out</DropdownMenuPrimitive.Item></DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root></div>;
}

function AccountFooter({authConfigured,openConnections,openArchived,confirmDeleteAll}:{authConfigured:boolean;openConnections:()=>void;openArchived:()=>void;confirmDeleteAll:()=>void}){
 if(!authConfigured)return <div className="profile-row"><CircleHelp size={18}/><span>Sign-in unavailable</span></div>;
 return <><Show when="signed-in"><ProfileMenu openConnections={openConnections} openArchived={openArchived} confirmDeleteAll={confirmDeleteAll}/></Show><Show when="signed-out"><SignInButton mode="modal"><button className="profile-signin">Sign in to DATUMM <ArrowUpRight size={15}/></button></SignInButton></Show></>;
}

function Mark({large=false}:{large?:boolean}){return <img className={cn('brand-mark',large&&'large')} src="/datumm-mark.png" alt="" aria-hidden="true"/>;}



export function Workspace({authConfigured,desktopPreview=false}:{authConfigured:boolean;desktopPreview?:boolean}){

 const [desktopAvailable,setDesktopAvailable]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
 const [accountStatus,setAccountStatus]=useState<AuthStatus>(),[accountStatusError,setAccountStatusError]=useState(''),[accountActionError,setAccountActionError]=useState(''),[accountBusy,setAccountBusy]=useState(false),[accountWorkspaceSubject,setAccountWorkspaceSubject]=useState<string>();
 const accountEpoch=useRef(0);
 const desktopLayout=true; // Studio layout does not grant native authority.
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
  const [agentEnabled,setAgentEnabled]=useState<boolean|null>(null),[workspaceReady,setWorkspaceReady]=useState(false);
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
 const [projects,setProjects]=useState<{id:string;title:string;chatCount:number;revision:number;isDefault?:boolean}[]>([]);
 const [newProject,setNewProject]=useState(''),[collapsedProjects,setCollapsedProjects]=useState<string[]>([]),[projectOrder,setProjectOrder]=useState<string[]>([]);
 const [renameTarget,setRenameTarget]=useState<{kind:'chat'|'project';id:string;title:string;revision:number}|null>(null),[renameTitle,setRenameTitle]=useState('');
 useEffect(()=>{try{for(const [key,set] of [['collapsed-projects',setCollapsedProjects],['project-order',setProjectOrder]] as const){const value=JSON.parse(localStorage.getItem('datumm-'+key)??'[]');if(Array.isArray(value)&&value.length<=100&&value.every(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)))set(value);}}catch{}},[]);
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

  const [left,setLeft]=useState(true),[right,setRight]=useState(true),[tab,setTab]=useState<'assistant'|'preview'|'activity'|'exports'|'tools'>('preview');
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
  const transition=settingsSidebarTransition(settingsOpen,desktopLayout,left,settingsPreviousLeft.current);
  settingsPreviousLeft.current=transition.previousLeft;
  if(transition.left!==left)setLeft(transition.left);
 },[settingsOpen,desktopLayout,left]);
 useEffect(()=>{
  if(!desktopLayout)return;
  const sync=()=>changeSettingsOpen(window.location.hash==='#settings');
  sync();window.addEventListener('hashchange',sync);
  return()=>window.removeEventListener('hashchange',sync);
 },[desktopLayout,changeSettingsOpen]);
 const [studioView,setStudioView]=useState<'workspace'|'activity'|'schedules'>('workspace');
 const [activityFilter,setActivityFilter]=useState('all');
 const [activitySelection,setActivitySelection]=useState('');
 useEffect(()=>setTab(desktopLayout?'assistant':'preview'),[desktopLayout]);
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
 useEffect(()=>{
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

 useEffect(()=>{
  if(!chatError)return;
  const pending=pendingSubmission.current;
   if(!pending)return;
  if(pending&&!pending.runStarted)setPrompt(current=>current||pending.text);
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
  const mobile=window.matchMedia('(max-width:700px)'),narrow=window.matchMedia(desktopLayout?'(max-width:850px)':'(max-width:1150px)');
  const update=()=>{setLeft(!mobile.matches);setRight(!narrow.matches);setViewportReady(true);};
  update();mobile.addEventListener('change',update);narrow.addEventListener('change',update);
  return()=>{mobile.removeEventListener('change',update);narrow.removeEventListener('change',update);};
 },[desktopLayout]);

 useEffect(()=>{
  const closeDrawer=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('[role="dialog"][data-state="open"]'))return;
   if(left&&window.matchMedia('(max-width:700px)').matches){
    setLeft(false);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('button[aria-label="Show sidebar"]')?.focus());return;
   }
   if(right&&window.matchMedia(desktopLayout?'(max-width:850px)':'(max-width:1150px)').matches){
    setRight(false);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('button[aria-label="Show inspector"]')?.focus());
   }
  };
  document.addEventListener('keydown',closeDrawer);
  return()=>document.removeEventListener('keydown',closeDrawer);
 },[left,right,desktopLayout]);

 const refresh=useCallback(async()=>{
   if(window.desktop&&!desktopPreview&&!testIdentity&&!['signed-in','expired-offline'].includes(accountStatus?.state??''))return;
   const epoch=accountEpoch.current;
   try{const [configuration,list,history,tools]=await Promise.all([api<RuntimeConfig>('config'),api<Device[]>('devices'),api<Run[]>('runs'+(historyView==='archived'?'?archived=true':'')),Promise.resolve<McpTool[]>([])]);
    if(epoch!==accountEpoch.current)return;
    setRuntimeConfig(configuration);setMcpTools(tools);
   if(desktopAvailable)void api<{id:string;title:string;chatCount:number;revision:number;isDefault?:boolean}[]>('projects').then(value=>{if(epoch===accountEpoch.current)setProjects(value);}).catch(()=>{});

   setConnected(true);setModels(configuration.models);if(!modelPreferenceInitialized.current){const taskFromUrl=new URLSearchParams(window.location.search).get('task');if(!taskFromUrl){setModel(configuration.defaultModel??'openai/gpt-6-luna');setReasoningEffort(configuration.defaultReasoningEffort??'high');}modelPreferenceInitialized.current=true;}setAgentEnabled(configuration.agentEnabled===true);setDevices(list);setRuns(history);

   setDeviceId(previous=>previous||list.find(d=>d.online)?.id||'');

  }catch{if(epoch===accountEpoch.current)setConnected(false);}finally{if(epoch===accountEpoch.current)setWorkspaceReady(true);}

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

  useEffect(()=>settledPoll(refresh,6000),[refresh]);
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

 useEffect(()=>{

  if(!runId)return;

  let live=true;const tick=async()=>{try{const value=await api<Run>('runs/'+runId);if(live){setRun(value);}}catch{}};

  const stop=settledPoll(tick,1500);return()=>{live=false;stop();};

 },[runId]);

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
   setError(!selectedDevice?.online?'Connect a Revit device before building. Open Connections to authorize this computer.':'Enable the DATUMM local bridge in Revit and close its settings panel before building.');return;
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
   setDesignVersion(version);setDrawingStyle('presentation');setDesignDiff('');setCompareVersion(null);setRun(await api<Run>('tasks/'+taskId));
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
  if(!run)return;setActionBusy(true);setError('');setConfirmedPlacement(null);
  try{const context=await api<PlacementContext>(`tasks/${run.id}/build-context?deviceId=${encodeURIComponent(deviceId||run.device_id)}`);setPlacementContext(context);setPlacementTask(run.id);setPlacementView('');}
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


 const closeMobileNav=()=>{if(window.matchMedia('(max-width:700px)').matches)setLeft(false);};
 const newTask=(projectId='')=>{if(mediaBusy)return;setStudioView('workspace');setTab(desktopLayout?'assistant':'preview');setPlanningGoalOpen(false);setNewProject(projectId);promptDrafts.current[sourceKey]=pendingSubmission.current&&!pendingSubmission.current.runStarted?pendingSubmission.current.text:prompt;recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setCompareVersion(null);setDrawingError('');const url=new URL(window.location.href);url.searchParams.delete('task');window.history.replaceState(null,'',url);pendingSubmission.current=null;void stop();submissionKey.current=null;commandRetry.current.clear();setRun(null);setRunId('');setMessages([]);setDesignVersion(null);setDesignDiff('');setError('');setPrompt(promptDrafts.current[projectId?'new:'+projectId:'new']??'');setUseCurrentModel(false);closeMobileNav();};

 const selectRun=(value:Run)=>{if(mediaBusy)return;setStudioView('workspace');setTab(desktopLayout?'assistant':'preview');setRight(true);setPlanningGoalOpen(false);promptDrafts.current[sourceKey]=pendingSubmission.current&&!pendingSubmission.current.runStarted?pendingSubmission.current.text:prompt;setPrompt(promptDrafts.current[value.id]??'');recoveryEpoch.current++;setConnectionNotice('');reviewEpoch.current++;setCompareVersion(null);setDrawingError('');pendingSubmission.current=null;submissionKey.current=null;void stop();commandRetry.current.clear();setRun(value);setRunId(value.id);setMode(value.mode);setModel(value.model);setReasoningEffort(value.reasoningEffort??'high');setUseCurrentModel((value.data as Run['data']&{model_context_requirement?:string}).model_context_requirement==='read');setDesignVersion(null);setDesignDiff('');setMessages([]);closeMobileNav();};
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
 const updateHistory=async(item:Run,action:'pin'|'unpin'|'archive'|'unarchive')=>{setActionBusy(true);setError('');try{await api(`tasks/${item.id}/history/${action.includes('pin')?'pin':'archive'}`,action==='pin'||action==='archive'?'POST':'DELETE',{expectedTaskVersion:item.taskVersion});if(runId===item.id)setRun(await api<Run>('tasks/'+item.id));await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};
 const removeTask=async()=>{if(!deleteTarget)return;setActionBusy(true);setError('');try{await api(`tasks/${deleteTarget.id}/history/delete`,'DELETE',{expectedTaskVersion:deleteTarget.taskVersion});if(runId===deleteTarget.id)newTask();setDeleteTarget(null);await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};
 const removeAllTasks=async()=>{if(deletePhrase!=='DELETE')return;setActionBusy(true);setError('');try{await api<{deleted:number}>('runs','DELETE');newTask();setDeleteAllOpen(false);setDeletePhrase('');await refresh();}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}};

 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.key.toLowerCase()==='n'&&!mediaBusy&&!actionBusy){event.preventDefault();newTask();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const messageError=error;
 const contextTitle=typeof nativeContext?.context.title==='string'?nativeContext.context.title:run?.data.context?.title??(selectedDevice?.online?'Revit connected':'Your model, in context');
 const contextView=typeof nativeContext?.context.activeViewName==='string'?nativeContext.context.activeViewName:run?.data.context?.activeViewName??(selectedDevice?.online?'Inspect to read the active view and level.':'Connect Revit to bring your project into the conversation.');

 const toggleLeft=()=>{if(!left&&window.matchMedia('(max-width:700px)').matches)setRight(false);setLeft(value=>!value);};
 const toggleRight=()=>{if(!right&&window.matchMedia('(max-width:700px)').matches)setLeft(false);setRight(value=>!value);};
 const hasContent=messages.length>0||Boolean(run);
 useEffect(()=>{if(plannedCandidate){setRight(true);setTab(desktopLayout?'assistant':'preview');}},[plannedCandidate?.fingerprint,runId,desktopLayout]);
 const filteredChats=runs.filter(item=>(!workflowFilter||workflowState(item).kind===workflowFilter&&!item.data.organized_done)&&item.title.toLowerCase().includes(search.toLowerCase()));
 const defaultProject=projects.find(project=>project.isDefault);
 const currentProject=projects.find(project=>project.id===(run?.projectId||newProject)&&!project.isDefault);
 const normalChat=(item:Run)=>!item.projectId||item.projectId===defaultProject?.id;
 const orderedProjects=projects.filter(project=>!project.isDefault).sort((a,b)=>(projectOrder.includes(a.id)?projectOrder.indexOf(a.id):projectOrder.length)-(projectOrder.includes(b.id)?projectOrder.indexOf(b.id):projectOrder.length));
 const chatRow=(item:Run)=><div key={item.id} className={cn('history-row',runId===item.id&&'selected')}><button className="history-item" disabled={mediaBusy||actionBusy} onClick={()=>selectRun(item)}>{item.pinned_at?<Pin size={14}/>:<MessageSquare size={14}/>}<span title={item.title}>{item.title}</span>{['queued','running'].includes(item.status)&&workflowState(item).kind==='in_progress'&&<span className="chat-running" aria-label="Chat running"/>}{workflowState(item).kind==='needs_input'&&item.status!=='completed'&&<CircleHelp size={12} className="chat-attention" aria-label="Chat needs attention"/>}</button><DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button className="icon-button task-menu-trigger" aria-label={`Options for ${item.title}`} data-run-id={item.id} disabled={actionBusy} onClick={event=>{dialogTrigger.current=event.currentTarget;}}><Ellipsis size={16}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu" align="start" sideOffset={5}><DropdownMenuPrimitive.Item onSelect={()=>void updateHistory(item,item.pinned_at?'unpin':'pin')}><Pin size={14}/>{item.pinned_at?'Unpin':'Pin chat'}</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>void updateHistory(item,item.archived_at?'unarchive':'archive')}><Archive size={14}/>{item.archived_at?'Restore chat':'Archive'}</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>{selectRun(item);setProjectContextOpen(true);}}><FolderOpen size={14}/>Projects & local files</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Separator/><DropdownMenuPrimitive.Item className="danger-item" onSelect={()=>{dialogTrigger.current=document.querySelector<HTMLButtonElement>(`button[data-run-id="${item.id}"]`);setDeleteTarget(item);}}><Trash2 size={14}/>Delete chat</DropdownMenuPrimitive.Item></DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root></div>;


 const chatOptions=<DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button className="desktop-panel-toggle" aria-label="Chat options" title="Chat options" disabled={actionBusy}><Ellipsis size={18}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu" align="end" sideOffset={6}>{run?<><DropdownMenuPrimitive.Item disabled={busy} onSelect={()=>void updateHistory(run,run.pinned_at?'unpin':'pin')}><Pin size={14}/>{run.pinned_at?'Unpin chat':'Pin chat'}</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item disabled={busy} onSelect={()=>setProjectContextOpen(true)}><FolderOpen size={14}/>Projects & local files</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item disabled={busy} onSelect={()=>void updateHistory(run,run.archived_at?'unarchive':'archive')}><Archive size={14}/>{run.archived_at?'Restore chat':'Archive chat'}</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Separator/></>:null}<DropdownMenuPrimitive.Item onSelect={()=>newTask()}><Plus size={14}/>New chat</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>setProjectContextOpen(true)}><FolderOpen size={14}/>Projects & local files</DropdownMenuPrimitive.Item></DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root>;
 const reviewScroll=useRef<StickToBottomContext|null>(null);
 const focusReview=(selector:string)=>{if(desktopLayout){setStudioView('workspace');setRight(true);setTab('assistant');}requestAnimationFrame(()=>{reviewScroll.current?.stopScroll();document.querySelector<HTMLElement>(selector)?.scrollIntoView({behavior:'smooth',block:'start'});});};
 const continueDesignBuild=async()=>{
  if(!run)return;setActionBusy(true);setError('');
  try{if(queueData?.design?.selected||queueData?.native_build){if(run.mode!=='build'&&!queueData?.native_build){await taskCommand({type:'change_mode',mode:'build'});setRun(await api<Run>('tasks/'+run.id));}setMode('build');}setRight(true);setTab('preview');focusReview(queueData?.native_build?'[aria-label="Native build review"]':queueData?.design?.selected?'[aria-label="Accepted design placement"]':'[aria-label="Validated design preview"]');}
  catch(error){setError((error as Error).message);throw error;}finally{setActionBusy(false);}
 };
 const designDraftKey=run&&queueData?.design?run.id+':'+queueData.design.brief.briefId:'';
  const askFromCanvas=(text:string)=>{setPrompt(previous=>appendViewportPrompt(previous,text));setRight(true);setTab('assistant');requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus());};
 const designReview=(liveRuntime||desktopPreview)&&queueData?.design&&run&&<DesignReview taskId={run.id} key={designDraftKey} draft={placementDrafts.current.get(designDraftKey)} onDraft={draft=>placementDrafts.current.set(designDraftKey,draft)} value={queueData.design} source={selectedSource?.image?{id:selectedSource.id,sha256:selectedSource.sha256,name:selectedSource.name,image:selectedSource.image,page:selectedSource.page}:undefined} nativeControlsAvailable={desktopAvailable} pending={actionBusy||executing||desktopPreview&&!liveRuntime} onHighlights={setDesignHighlights} selectedElement={selectedDesignElement} onInspect={fingerprint=>{setInspectedDesignFingerprint(fingerprint);setRight(true);setTab('preview');}} model={model} onAsk={text=>askFromCanvas(text)} goalReview={run.data.planning_goal?.status==='needs_review'&&run.data.planning_goal.acceptedInputRevision!==run.data.planning_goal.inputRevision} onReview={async input=>{setActionBusy(true);try{const saved=await api<Run>('tasks/'+run.id);const result=await api<{task:Run;annotation?:unknown}>(`tasks/${run.id}/design-review`,'POST',{expectedTaskVersion:saved.taskVersion,design:input});setRun(result.task);if(result.annotation){const current=await api<Run>('tasks/'+run.id);setRun(current);const annotation=(current.data as {design?:DesignRecord}).design?.feedback?.at(-1);setPrompt(previous=>previous+(previous?'\n':'')+'Design feedback (reference only): '+JSON.stringify(annotation??result.annotation));}await refresh();}finally{setActionBusy(false);}}} mode={mode} nativeBuild={queueData.native_build} onBuild={continueDesignBuild} sessions={devices.filter(d=>d.online).map(d=>({id:d.id,name:d.name??d.id}))} onAction={async(action,design)=>{
       if(action==='design_build')setMode('build');setActionBusy(true);try{if(!window.desktop)throw new Error('Use the desktop for exact design acceptance.');const saved=await api<Run>(`tasks/${run.id}`);setRun(saved);const result=await window.desktop.nativeBuildAction(run.id,action,{expectedTaskVersion:saved.taskVersion,design});if(action!=='design_context'){setRun(result as Run);focusReview(action==='design_prepare'||action==='design_build'?'[aria-label="Native build review"]':action==='design_select'&&mode==='build'?'[aria-label="Accepted design placement"]':'[aria-label="Validated design preview"]');}return result;}catch(error){try{setRun(await api<Run>(`tasks/${run.id}`));}catch{}throw error;}finally{setActionBusy(false);}
      }}/>;
 const nativeAction=async(action:'approve'|'reconcile'|'show'|'select')=>{
       if(!run||!queueData?.native_build)return;setActionBusy(true);
       try{if(!window.desktop)throw new Error('Open the desktop to approve native operations.');const row=queueData.native_build;const result=await window.desktop.nativeBuildAction(run.id,action,{expectedTaskVersion:run.taskVersion,proposal:{proposalId:row.proposal.proposalId,approvalHash:row.proposal.approvalHash,documentId:row.changes.documentId,expectedRevision:row.changes.expectedRevision}});setRun(result as Run);}catch(error){try{setRun(await api<Run>(`tasks/${run.id}`));}catch{}throw error;}finally{setActionBusy(false);}
      };
 const nativeReview=liveRuntime&&queueData?.native_build&&<NativeBuildReview value={queueData.native_build} pending={actionBusy||executing} nativeAvailable={desktopAvailable} onRefresh={async()=>{
  if(!run||!window.desktop)throw Error('Open DATUMM Desktop to refresh the exact proposal.');
  const row=queueData.native_build,old=row.design?.binding?.placement;
  setActionBusy(true);try{
   const saved=await api<Run>('tasks/'+run.id);setRun(saved);
   const current=(saved.data as any).native_build;
   if(!current||current.state!=='preview'||current.operationId||current.proposal?.proposalId!==row.proposal.proposalId||current.proposal?.approvalHash!==row.proposal.approvalHash||current.changes?.documentId!==row.changes.documentId||current.changes?.expectedRevision!==row.changes.expectedRevision)throw Error('The saved proposal changed. Review the current native proposal before refreshing it.');
   if(row.design){
    if(!old)throw Error('Open the accepted design placement controls to prepare a fresh measured proposal.');
    if((saved.data as any).design?.selected!==current.design?.fingerprint)throw Error('The accepted design changed. Review its current version before preparing another proposal.');
    const context=await window.desktop.nativeBuildAction(run.id,'design_context',{expectedTaskVersion:saved.taskVersion,design:{sessionId:old.sessionId}}) as any;
    if(context.catalog.documentId!==old.documentId)throw Error('The Revit document changed. Inspect placement and review the current loaded types.');
    const {typeIds:_,...placement}=old;
    const result=await window.desktop.nativeBuildAction(run.id,'design_prepare',{expectedTaskVersion:saved.taskVersion,design:{fingerprint:current.design.fingerprint,placement:{...placement,revision:context.catalog.revision}}});setRun(result as Run);
   }else{
    const result=await window.desktop.nativeBuildAction(run.id,'refresh',{expectedTaskVersion:saved.taskVersion,proposal:{proposalId:current.proposal.proposalId,approvalHash:current.proposal.approvalHash,documentId:current.changes.documentId,expectedRevision:current.changes.expectedRevision}});setRun(result as Run);
   }
  }catch(error){try{setRun(await api<Run>('tasks/'+run.id));}catch{}throw error;}finally{setActionBusy(false);}
 }} onCorrection={()=>setPrompt(previous=>previous+(previous?'\n':'')+'Inspect the current result of native operation '+queueData.native_build.operationId+' and compare it with the saved exact proposal. Explain measured differences and prepare a correction for review if needed. Do not repeat the original operation or apply any correction automatically.')} onAction={nativeAction}/>;
 const designTurn=run?.data.designConversationIndex??savedTurns.findLast(turn=>turn.result?.design?.brief?.version===queueData?.design?.brief.version)?.conversationIndex??0;
 const nativeTurn=run?.data.nativeBuildConversationIndex??designTurn;
  const visiblePrompt=splitViewportPrompt(prompt);
 const workflowNoticeKey=JSON.stringify([run?.id,run?workflowState(run).label:'',run?.currentPlanRef?.fingerprint,queueData?.native_build?.state,queueData?.native_build?.proposal?.proposalId,buildStep]);
 const conversationPanel=(
  <main className="main-panel">



   <div className={cn('main-content',hasContent&&'with-messages')}>

     {!hasContent?desktopLayout?<div className="welcome studio-welcome"><div className="studio-welcome-brand"><img src="/datumm-mark.png" alt=""/><span>Your architectural workspace</span></div><h1>What are we designing today?</h1><p>Start with an idea, a drawing, or a question about your model.</p></div>:offlineFixture?<div className="welcome"><div className="eyebrow"><span className="tiny-line"/> OFFLINE FIXTURE</div><h1>Check the<br/><span>local backend</span></h1><p>Validate the packaged brief, inspect its task history and download the result. Connect OpenRouter in Settings to start live Ask and Plan.</p></div>:liveRuntime?<div className="welcome"><div className="eyebrow"><span className="tiny-line"/> LOCAL OPENCODE WORKSPACE</div><h1>Understand your model.<br/><span>Think through your plan.</span></h1><p>Chat with your selected OpenRouter model. Inspect local Revit evidence through the installed DATUMM plugin.</p><div className="suggestions"><button disabled={!workspaceReady} onClick={()=>{setMode('ask');setUseCurrentModel(true);setPrompt('Discover local Revit sessions, inspect the active document, and summarize what you can verify.');}}><Box size={18}/><span>Inspect my Revit model<small>Use measured read-only evidence</small></span><ArrowUpRight size={14}/></button><button disabled={!workspaceReady} onClick={()=>{setMode('plan');setPrompt('Help me plan a comfortable three-bedroom home. Ask for the site dimensions and requirements before recommending a layout.');}}><Workflow size={18}/><span>Think through a plan<small>Clarify requirements and compare options</small></span><ArrowUpRight size={14}/></button></div></div>:<div className="welcome"><div className="eyebrow"><span className="tiny-line"/> YOUR ARCHITECTURAL WORKSPACE</div><h1>What will you design today?</h1><p>Think through a space. Explore a plan. Build it in Revit.</p><div className="suggestions"><button disabled={!workspaceReady} onClick={()=>{setMode('build');setPrompt(agentEnabled!==false?'Draft a meeting room in the open project. Inspect it first, ask for dimensions and placement when needed, then prepare a build plan.':'Create the verified 3BHK demonstration in my blank Revit project.');}}><LayoutTemplate size={18}/><span>{agentEnabled!==false?'Draft from a goal':'Draft a 3BHK'}<small>{agentEnabled!==false?'Inspect, plan and verify':'Verified native demonstration'}</small></span><ArrowUpRight size={14}/></button><button disabled={!workspaceReady} onClick={()=>{setMode('plan');setPrompt(agentEnabled!==false?'Plan a home with the rooms I describe, show alternatives, and explain your assumptions.':'Help me plan a comfortable three-bedroom home, focusing on circulation and natural light.');}}><Workflow size={18}/><span>{agentEnabled!==false?'Plan any supported room program':'Think through a plan'}<small>Explore before you build</small></span><ArrowUpRight size={14}/></button><button disabled={!workspaceReady} onClick={()=>{setMode('ask');setUseCurrentModel(true);setPrompt('What is open in Revit, and which drafting operations can you help me with?');}}><Box size={18}/><span>Understand my model<small>Start with what is already there</small></span><ArrowUpRight size={14}/></button></div></div>:

    <Conversation className="conversation" contextRef={reviewScroll}><ConversationContent className="conversation-inner">{run&&(run.conversation?.length||messages.length===0)&&(run.conversation?.length?run.conversation:[{prompt:run.title,answer:run.data.answer}]).map((turn,index)=><div key={index} className="conversation-turn" data-conversation-index={index}>{turn.prompt&&<Message from="user"><MessageContent><PromptContent text={turn.prompt}/></MessageContent></Message>}<AgentActivity compact={desktopLayout} nativeMessages={executing&&index===(run.conversation?.length??1)-1?run.data.native_messages:turn.nativeMessages} events={traceTurns[index]??[]} active={executing&&index===(run.conversation?.length??1)-1} waiting={nativeQuestions.length>0} mode={index===(run.conversation?.length??1)-1?run.mode:'Agent'} model={index===(run.conversation?.length??1)-1?run.model:'Saved turn'} manifest={savedTurns.find(saved=>saved.conversationIndex===index)?.result?.manifest??(index===(run.conversation?.length??1)-1?run.data.run_manifest:undefined)} evidence={savedTurns.find(saved=>saved.conversationIndex===index)?.result?.evidence??(index===(run.conversation?.length??1)-1?run.data.run_manifest?.tools:[])} todos={index===(run.conversation?.length??1)-1?nativeTodos:[]}/>{turn.answer&&<Message from="assistant"><div className="assistant-label"><Mark/> DATUMM</div><MessageContent><MessageResponse>{turn.answer}</MessageResponse></MessageContent></Message>}{index===designTurn&&designReview}{index===nativeTurn&&nativeReview}{index<(run.conversation?.length??1)-1&&index!==designTurn&&<SavedTurnResult turn={savedTurns.find(saved=>saved.conversationIndex===index)} taskId={run.id} onArtifacts={()=>{setRight(true);setTab('exports');}}/>}</div>)}{(run?.conversation?.length?[]:messages).filter(message=>message.role!=='assistant'||message.parts.some(part=>part.type==='text'&&part.text.trim())).map(message=><Message key={message.id} from={message.role}>{message.role==='assistant'&&<div className="assistant-label"><Mark/> DATUMM</div>}<MessageContent>{message.parts.filter(p=>p.type==='text').map((part,i)=>message.role==='user'?<PromptContent key={i} text={part.text}/>:<MessageResponse key={i}>{message.id===messages.at(-1)?.id&&responseSummary?responseSummary:part.text}</MessageResponse>)}</MessageContent></Message>)}
    {run&&terminal.has(run.status)&&run.status!=='needs_input'&&run.data.answer&&!run.conversation?.length&&messages.length>0&&!messages.some(message=>message.role==='assistant'&&message.parts.some(part=>part.type==='text'&&part.text.trim()))&&<Message from="assistant"><div className="assistant-label"><Mark/> DATUMM</div><MessageContent><MessageResponse>{responseSummary??run.data.answer}</MessageResponse></MessageContent></Message>}

      {executing&&(!run||!run.conversation?.length&&messages.length>0)&&<AgentActivity compact={desktopLayout} nativeMessages={executing?run?.data.native_messages:undefined} events={traceTurns.at(-1)??[]} active waiting={nativeQuestions.length>0} mode={mode} model={model} todos={nativeTodos}/>}
     {(liveRuntime||desktopPreview)&&run&&(run.data.planning_goal||planningGoalOpen)&&<PlanningGoalPanel key={run.id} goal={run.data.planning_goal} pending={actionBusy||desktopPreview&&!liveRuntime} onControl={async body=>{setActionBusy(true);try{const saved=await api<Run>('tasks/'+run.id);setRun(await api<Run>(`tasks/${run.id}/goal`,'POST',{...body,expectedTaskVersion:saved.taskVersion}));await refresh();}finally{setActionBusy(false);}}}/>}
      {nativeQuestions.map(question=><OpenCodeQuestions key={question.id} question={question} onAnswer={async (answers,annotationIntent)=>{const task=run!.id,epoch=recoveryEpoch.current;await api(`tasks/${task}/questions/answer`,'POST',{questionId:question.id,answers,...(annotationIntent?{annotationIntent}:{})});const current=await api<Run>(`tasks/${task}`);if(epoch===recoveryEpoch.current)setRun(current);}}/>)}
      {liveRuntime&&queueData?.failure&&<section className="error-card" role="alert"><strong>{queueData.failure.code==='CANCELLED'?'Stopped':'Turn interrupted'}</strong><p>Your chat and completed work are saved.</p><Button variant="secondary" disabled={busy} onClick={()=>{setPrompt('Continue from the saved context. Resolve the last blocker and reuse completed work; do not repeat any native operation.');document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();}}>Continue this chat</Button></section>}
      {savedSources.length>0&&<div className="saved-source-strip"><label>Reference source<select aria-label="Select reference source" value={selectedSource?.id??""} onChange={event=>setSelectedSourceId(event.target.value)}>{savedSources.map(row=><option key={row.id} value={row.id}>{row.name}{row.page?` · page ${row.page}`:""}</option>)}</select></label><small>Local source provenance retained with this chat.</small></div>}


      {liveRuntime&&nativeContext&&<details className="agent-evidence-card"><summary>Measured Revit context · {new Date(nativeContext.observedAt).toLocaleTimeString()}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(nativeContext.context,null,2)}</pre><small>Connected session {nativeContext.sessionId}. A level must be selected by its measured ID; similar names are not confirmation.</small></details>}
      {liveRuntime&&nativeContextError&&<p role="status">Revit discovered, but current document/level context could not be read: {nativeContextError}</p>}

     {run&&(run.data.native_batches?.length||run.data.m09_revision||run.data.receipt?.state==='committed')?<BuildComparisonCard key={run.id} comparison={run.data.build_comparison} feedback={run.data.build_feedback??[]} revisions={run.data.build_revision_count??0} active={['queued','running','awaiting_approval','reconciling'].includes(run.status)} onCommand={async command=>{const latest=await api<Run>('tasks/'+run.id);commandExpected.current={taskId:latest.id,taskVersion:latest.taskVersion??0,planVersion:latest.currentPlanRef?.version??0};await taskCommand(command);setRun(await api<Run>('tasks/'+run.id));}}/>:null}
     {run?.data.build_comparison_error&&<p role="status">Measured comparison needs a refresh: {run.data.build_comparison_error}</p>}

     {run?.data.proposal?.deletions?.map(closure=><div className="agent-evidence-card" key={closure.key} role="group" aria-label="Exact Revit deletion closure"><div className="section-caption">NATIVE DELETE REVIEW · {closure.elements.length} {closure.elements.length===1?'ELEMENT':'ELEMENTS'}</div><strong>Target {closure.targetId}</strong><p>Revit evaluated this complete dependent set in a rollback-only transaction. Approving the proposal removes exactly these IDs. Any change to the set cancels the write; this task requires Review approval.</p><ol>{closure.elements.map(element=><li key={element.id}>{element.kind.replaceAll('_',' ')} · {element.name} · <code>{element.id}</code>{element.id===closure.targetId?' (target)':' (dependent)'}</li>)}</ol></div>)}

     {(run?.status==='awaiting_approval'||run?.data.error==='APPROVAL_REQUIRED')&&<div className="approval-card"><div><ShieldCheck size={20}/><strong>Approve these exact changes</strong></div><p>The Revit dry run passed. Review the proposed changes below and their counts in Context. Approving here authorizes this exact proposal for the connected project; DATUMM will then commit and verify it in Revit.</p><div className="approval-details">{run.data.annotation_view_review&&<span>Annotation view <b>{run.data.annotation_view_review.name}</b></span>}<span>Project <b>{run.data.context?.title??'Connected project'}</b></span><span>Revision <b>{run.data.proposal?.revision??'—'}</b></span><span>Proposal <b>{run.data.proposal?.approvalHash?.slice(0,12)??'—'}…</b></span></div><small>Expires {run.data.proposal?.expiresAt?new Date(run.data.proposal.expiresAt).toLocaleTimeString():'soon'}. DATUMM does not save the project file.</small><div className="approval-actions">{proposalExpired&&(run.data.variable_selection||run.data.m09_revision)&&!committedBuild&&<Button variant="secondary" disabled={actionBusy} onClick={()=>act('refresh-proposal')}>Refresh expired review</Button>}<Button onClick={()=>act('resume')} disabled={actionBusy||proposalExpired}>{actionBusy?<Loader2 size={15} className="spin"/>:null} Approve and build <ArrowUpRight size={15}/></Button><Button variant="ghost" onClick={()=>act('cancel')} disabled={actionBusy}>Cancel</Button>{run.data.agent_execution&&!run.data.proposal?.deletions?.length&&<Button variant="secondary" disabled={actionBusy} onClick={event=>{dialogTrigger.current=event.currentTarget;setAccessBatches(plannedAccessBatches);setAccessMargin(0);setAccessReview(null);setAccessDialog(true);}}>Configure task Full Access</Button>}</div></div>}

     {run?.data.build_type_review&&<div className="agent-evidence-card" aria-label="Native type size review"><div className="section-caption">NATIVE SIZE REVIEW · REVISION {run.data.build_type_review.revision}</div><p>{run.data.build_type_review.resolution}</p><details open><summary>Accepted geometry requires (mm)</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(run.data.build_type_review.requiredSizes,null,2)}</pre></details><details><summary>Discovered loaded type choices · {run.data.build_type_review.loadedChoices.length}</summary><ol>{run.data.build_type_review.loadedChoices.map((row,index)=><li key={index}><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(row,null,2)}</pre></li>)}</ol></details></div>}
     {(run?.data.variable_selection||run?.data.m09_revision)&&run.data.compiled?.changes&&<div className="agent-evidence-card" aria-label="Native-bound changes"><div className="section-caption">NATIVE PROPOSAL · {run.data.compiled.changes.operations.length} OPERATIONS</div><p>Positions use Revit internal XY millimetres in the reviewed project and level. Hosted openings refer to wall keys in this batch; annotations use committed native IDs and inspected references.</p>{run.data.compiled.svg&&<img style={{width:'100%',borderRadius:8}} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(run.data.compiled.svg)} alt="Native-bound wall positions at the confirmed origin and rotation"/>}<details open={run.status==='awaiting_approval'}><summary>Review exact native changes</summary><ol>{run.data.compiled.changes.operations.map(op=><li key={op.key}><strong>{op.key} · {op.kind.replaceAll('_',' ')}</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(op,null,2)}</pre></li>)}</ol></details></div>}
     {run?.data.concept&&!run.data.agent_design?.conceptImage&&<div className="saved-plan-card"><div className="section-caption">AI CONCEPT · {run.data.concept.model.split('/')[1]}</div><img style={{width:'100%',borderRadius:8}} src={`/api/service/runs/${run.id}/export/concept`} alt="AI generated architectural concept; not measured geometry"/><p>{run.data.concept.provenance}</p><a href={`/api/service/runs/${run.id}/export/concept`} download>Download concept image</a></div>}
     {run?.data.concept_error&&!run.data.agent_design&&<div className="error-card" role="status">{run.data.concept_error}</div>}
     {run?.data.task_access&&!run.data.task_access.revoked&&<div className="agent-evidence-card" role="status"><strong>Task Full Access enabled</strong><p>Expires {new Date(run.data.task_access.expiresAt).toLocaleTimeString()} · {run.data.task_access.remaining} {run.data.task_access.remaining===1?'batch':'batches'} remain within the reviewed scope.</p><Button variant="secondary" disabled={actionBusy} onClick={()=>{void api(`runs/${run.id}/access`,'DELETE').then(()=>setRun({...run,data:{...run.data,task_access:{...run.data.task_access!,revoked:true}}})).catch(e=>setError((e as Error).message));}}>Revoke access</Button></div>}
     {run?.data.agent_task_plan&&<div className="agent-evidence-card" aria-label="Agent task plan"><div className="section-caption">TASK PLAN · VERSION {run.data.agent_task_plan.version}</div><strong>{run.data.agent_task_plan.goal}</strong><ol>{run.data.agent_task_plan.steps.map(step=><li key={step.key}><span>{taskStepCompleted(run,step)?'✓ ':''}{step.title}</span><details><summary>Expected result</summary>{step.expectedResult}</details></li>)}</ol><small>Planning does not authorize model changes.</small></div>}
     {run?.status==='needs_input'&&run.data.agent_question&&<AgentQuestions key={`${run.id}:${run.data.agent_question.id}`} runId={run.id} question={run.data.agent_question} onReply={replyToQuestion}/>}
     {run?.data.agent_draft&&<div className="agent-evidence-card" aria-label={outcome?.verified?'Executed drafting changes':'Proposed drafting changes'}><div className="section-caption">{outcome?.verified?'EXECUTED DRAFTING PLAN':'DRAFTING PLAN'} · {run.data.agent_draft.changes.operations.length} {run.data.agent_draft.changes.operations.length===1?'OPERATION':'OPERATIONS'}</div><strong>{outcome?.verified?completedDraftTitle(run.data.agent_draft.changes.title):run.data.agent_draft.changes.title}</strong>{run.data.agent_draft.previewSvg&&<><button className="plan-preview-button" onClick={event=>openCanvas(event.currentTarget)}><img alt="Proposed drafting paths and positions; schematic symbols" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(run.data.agent_draft.previewSvg)}/><span><Expand size={15}/> Expand drafting preview</span></button><small>{outcome?.verified?'Verified edit comparison':'Proposed paths and positions'} · Wall widths and opening symbols are schematic.</small></>}<p>Positions use Revit internal XY millimetres. For a move, the native point is a displacement vector; the preview shows the current and intended positions.</p><details open={run.status==='awaiting_approval'}><summary>Review exact changes</summary><ol>{run.data.agent_draft.changes.operations.map(op=><li key={op.key}><strong>{op.key} · {op.kind.replaceAll('_',' ')}</strong>{op.kind==='move'&&run.data.agent_draft?.moveSemantics==='anchored-goal-delta-mm-v2'&&<small> Current anchor ({run.data.agent_draft.moveAnchors?.[op.key]?.fromPoint.x}, {run.data.agent_draft.moveAnchors?.[op.key]?.fromPoint.y}) mm → intended ({run.data.agent_draft.moveAnchors?.[op.key]?.toPoint.x}, {run.data.agent_draft.moveAnchors?.[op.key]?.toPoint.y}) mm. Native displacement ({(op.point as {x:number;y:number}).x}, {(op.point as {x:number;y:number}).y}) mm.</small>}<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(op,null,2)}</pre></li>)}</ol></details><details><summary>Goal criteria</summary><ul>{(outcome?.verified?reviewCriteria(run.data.agent_draft.successCriteria):run.data.agent_draft.successCriteria).map(item=><li key={item}>{item}</li>)}</ul></details>{run.mode!=='build'&&<div className="plan-actions"><small>{run.data.agent_draft.changes.operations.some(op=>op.kind==='move')&&run.data.agent_draft.moveSemantics!=='anchored-goal-delta-mm-v2'?'This older move plan needs a fresh native inspection and replan.':'Prepared for review · No model changes.'}</small><Button disabled={busy||run.status!=='completed'||!selectedDevice?.online||(run.data.agent_draft.changes.operations.some(op=>op.kind==='move')&&run.data.agent_draft.moveSemantics!=='anchored-goal-delta-mm-v2')} onClick={()=>void buildLegacy()}>Prepare build</Button></div>}</div>}
     {run&&!run.data.agent_design&&run.mode==='plan'&&run.data.agent_interpreted_brief&&terminal.has(run.status)&&<div className="saved-plan-card" role="status"><strong>No saved plan geometry</strong><p>{run.data.error??run.data.answer??'This task has not produced a valid layout. Complete the pending clarification or describe the constraint you want to change.'}</p><Button variant="secondary" onClick={()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus()}>Continue this task</Button></div>}
     {run?.data.agent_design&&<div className="saved-plan-card agent-plan-card" aria-label="Plan review"><div className="section-caption">DIMENSIONED PLAN · {run.data.agent_design.candidates.length} ALTERNATIVES <span>Concept geometry</span></div>
      <div className="plan-actions" role="group" aria-label="Concept alternatives">{run.data.agent_design.candidates.map((candidate,index)=><Button key={candidate.planId} variant={run.currentPlanRef?.planId===candidate.planId?'default':'secondary'} aria-pressed={run.currentPlanRef?.planId===candidate.planId} disabled={busy} onClick={()=>void reviewAlternative(candidate)}>Alternative {index+1}</Button>)}</div>
      {drawingLoading&&<p role="status">Loading the saved exact drawing…</p>}
      {drawingError&&<div className="error-card" role="alert">{drawingMissing?'Saved plan geometry is unavailable. Request a change in this task.':'Geometry is saved; the drawing could not be loaded.'} {drawingError}<Button variant="secondary" disabled={drawingLoading} onClick={()=>setDrawingRetry(n=>n+1)}>Retry exact drawing</Button></div>}
      {designVersion&&<>{drawingError&&<p role="status">Last valid drawing retained for reference.</p>}{!drawingCurrent&&<p role="status">Older drawing v{designVersion.version} retained while the current version loads.</p>}<div className={compareVersion?'plan-comparison':''}>{compareVersion&&<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} key={'compare'+compareVersion.planId+compareVersion.version} drawing={compareVersion} label="Previous / comparison plan" readOnly/>}<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} key={designVersion.planId+designVersion.version} drawing={designVersion} onStyleChange={setDrawingStyle} onAsk={askFromCanvas}/></div><div className="plan-actions"><Button variant="secondary" disabled={busy||!drawingCurrent} onClick={()=>void compareDrawing()}>Compare saved versions</Button>{compareVersion&&<Button variant="secondary" onClick={()=>setCompareVersion(null)}>Close comparison</Button>}<a href={`/api/service/runs/${run.id}/export/svg?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`} download>SVG</a><a href={`/api/service/runs/${run.id}/export/preview-png?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`} download>PNG</a><a href={`/api/service/runs/${run.id}/export/plan-pdf?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`} download>Plan PDF</a></div></>}
      {!designVersion&&!drawingLoading&&!drawingError&&<p role="status">No drawing is available for this saved geometry. Retry the exact version or request changes in this task.</p>}
      {designDiff&&<p role="status">{designDiff}</p>}
      <details><summary>Assumptions · {reviewAssumptions.length}</summary><ul>{reviewAssumptions.map((item,index)=><li key={index}>{item}</li>)}</ul></details><details><summary>Search checks and limits</summary><ul>{run.data.agent_design.diagnostics.map((item,index)=><li key={index}>{item}</li>)}</ul></details>
      <p>Review this exact version and its assumptions. Acceptance saves your design choice; native changes still require exact proposal approval.</p>
      <div className="plan-actions"><Button variant="secondary" onClick={()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus()}>Request changes</Button>{!planAccepted?<Button disabled={busy||drawingLoading||!!drawingError||!drawingCurrent} onClick={()=>void acceptDrawing()}>Accept this plan</Button>:run.mode!=='build'?<><span role="status">Plan accepted — switch to Build</span><Button disabled={busy||drawingLoading||!!drawingError||!drawingCurrent} onClick={()=>void switchDrawingToBuild()}>Switch to Build</Button></>:<><span role="status">Plan accepted · Build mode</span><Button disabled={buildStep!=='prepare'||busy||!selectedDevice?.online||revitSessions!==1||!!drawingError||placementTask!==run.id||!confirmedPlacement} onClick={()=>void buildVariable()}>Prepare accepted plan</Button></>}</div>
      {planAccepted&&run.mode==='build'&&!run.data.compiled&&<Button variant="secondary" disabled={busy} onClick={()=>{setBuildSetupOpen(true);void reviewPlacement();}}>Choose Revit placement</Button>}</div>}

     {run?.data.agent_design&&selectedDevice?.online&&<div className="agent-evidence-card"><div className="section-caption">FULL ACCESS FOR THIS CONCEPT</div><p>Optional: allow one automatic exact-proposal approval for the selected version in this Revit project. The grant expires in 30 minutes, is capped at 120 elements, and can be revoked here. DATUMM will still dry-run and verify the build.</p>{selectedDevice.agentControl?.binding.briefId===run.data.agent_design.briefId?<div className="plan-actions"><span role="status">Scoped access enabled · {selectedDevice.agentControl.remaining} build remaining</span><Button variant="secondary" disabled={actionBusy} onClick={()=>void revokeVariableGrant()}>Revoke access</Button></div>:<Button variant="secondary" disabled={busy||revitSessions!==1} onClick={()=>void grantVariable()}>Enable for selected concept</Button>}</div>}
     {run?.data.agent_element_pages&&<div className="agent-evidence-card"><div className="section-caption">NATIVE ELEMENT EVIDENCE</div>{run.data.agent_element_pages.filter((page,index,pages)=>!pages.slice(index+1).some(next=>JSON.stringify(next.scope)===JSON.stringify(page.scope))).map((page,index)=><details key={index}><summary>{page.scope.categories.join(', ')} · {page.coverage.returnedCount}/{page.coverage.totalCount} · {page.coverage.status}</summary><p>Inspected straight wall length (XY projection): {page.aggregates.inspectedStraightWallProjectedLengthM.toFixed(2)} m</p><ul>{page.limitations.map(item=><li key={item}>{item}</li>)}</ul></details>)}</div>}
     {run?.data.agent_inspection&&<div className="agent-evidence-card"><div className="section-caption">{outcome?.verified?'PRE-BUILD MODEL ANALYSIS':'MODEL ANALYSIS'} · REVISION {run.data.agent_inspection.revision}</div><div className="plan-facts">{Object.entries(run.data.agent_inspection.counts).map(([name,count])=><span key={name}>{count} {name}</span>)}</div><p>{run.data.agent_inspection.coverage.map(item=>`${item.category}: ${item.status} (${item.returnedCount}${item.totalCount===null?'':`/${item.totalCount}`})`).join(' · ')}</p><details><summary>Coverage limits</summary><ul>{run.data.agent_inspection.limitations.map(item=><li key={item}>{item}</li>)}</ul></details></div>}
     {outcome?.verified&&run?.data.agent_postbuild_inventory&&<div className="agent-evidence-card" aria-label="Model after build"><div className="section-caption">MODEL AFTER BUILD · REVISION {run.data.agent_postbuild_inventory.revision}</div><div className="plan-facts">{Object.entries(run.data.agent_postbuild_inventory.counts).map(([name,count])=><span key={name}>{count} {name}</span>)}</div><small>Native inventory at this revision. Per-element checks and batch history appear below.</small></div>}
     <AgentScheduler value={run?.data.agent_scheduler}/>
     {run&&<EvidenceResults coverage={run.data.agent_coverage} findings={run.data.agent_advice} research={run.data.agent_research}/> }
     {run&&<AgentSpecialists results={run.data.agent_specialists} taskId={run.id}/>}
     {run?.data.agent_interpreted_brief&&<div className="saved-plan-card" aria-label="Interpreted brief"><div className="section-caption">YOUR BRIEF<span>{run.data.agent_interpreted_brief.status==='fallback'?'Literal fallback':'Source checked'}</span></div><div className="plan-facts">{run.data.agent_interpreted_brief.dimensions.map((d,i)=><span key={i}>{d.role==='unknown'?'Scope unconfirmed':d.role} · {d.sourceText}{d.widthMm&&d.depthMm?` = ${d.widthMm} × ${d.depthMm} mm`:' · units unconfirmed'}</span>)}</div>{Object.entries(run.data.agent_interpreted_brief.values).filter(([key])=>['bedrooms','guestRooms','bathrooms','entry','jurisdiction'].includes(key)).map(([key,fact])=><p key={key}>{key.replace('guestRooms','Guest rooms')}: {String(fact.value)} · {fact.provenance}</p>)}{run.data.agent_interpreted_brief.program.livingHall&&<p>BHK program includes living/hall and kitchen.</p>}{run.data.agent_interpreted_brief.unresolved.length>0&&<p>Still to confirm: {run.data.agent_interpreted_brief.unresolved.map(k=>k.replaceAll('_',' ')).join(', ')}.</p>}{run.data.agent_interpreted_brief.assumptions.map(a=><p key={a}>{a}</p>)}<small>Brief interpretation grants no model write authority. {run.data.agent_interpreted_brief.policy?`Interpreter: ${run.data.agent_interpreted_brief.policy.modelId}.`:''}</small></div>}
     {run?.data.plan&&previewSvg&&<div className="saved-plan-card"><div className="section-caption">PLAN REVISION {run.data.plan.version}<span>No model changes</span></div><div className="plan-facts"><span>{run.data.plan.brief.bedrooms} bedrooms</span><span>{run.data.plan.brief.bathrooms} bathroom{run.data.plan.brief.bathrooms>1?'s':''}</span><span>{run.data.plan.brief.entrance} entry</span><span>14 × 12 m site</span></div><button className="plan-preview-button" onClick={event=>openCanvas(event.currentTarget)}><img alt="Saved conceptual floor plan" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(previewSvg)}/><span><Expand size={15}/> Expand preview</span></button><details className="plan-schedule"><summary>Room areas · {previewRooms.length} spaces</summary><div className="room-list">{previewRooms.map(r=><div key={r.name}><span>{r.name}</span><span>{r.expectedAreaM2.toFixed(1)} m²</span></div>)}</div></details><p>Describe a change below, or build this version in your connected Revit project.</p><div className="plan-actions"><small>Concept plan · Exact proposal approval required before building.</small><Button disabled={busy||run.status!=='completed'} onClick={()=>void buildLegacy()}>Build this plan</Button></div></div>}
     {batchInProgress&&<div className="agent-evidence-card" role="status"><div className="section-caption">BUILD IN PROGRESS</div><strong>{run?.data.agent_result?.batchHistory?.length??1} verified native batch</strong><p>The next step uses a fresh Revit read and a new exact proposal. Earlier approval cannot authorize another batch.</p></div>}
     {outcome?.verified&&!queueData?.native_build&&!batchInProgress&&!partialGoal&&<div className="success-card" role="status"><Check size={18}/><div><strong>{verifiedBatchCount>1?`${verifiedBatchCount} native batches verified in ${run?.data.context?.title??'Revit'}.`:`${outcome?.deleted?`${outcome.deleted} deleted, `:''}${verifiedCount} ${verifiedCount===1?'element':'elements'} verified in ${run?.data.context?.title??'Revit'}.`}</strong><small>{run?.data.draft_task?'Goal-directed drafting · ':run?.data.variable_selection?`Selected concept version ${run.data.variable_selection.version} · `:run?.data.selected_plan?`Saved plan revision ${run.data.selected_plan.version} · `:'Verified demonstration · '}{run?.data.recovery?'Verified by operation-status recovery':'Verified after build'} · No Revit warnings</small>{verifiedBreakdown&&<small>{verifiedBreakdown}</small>}<button onClick={()=>{setRight(true);setTab('exports');}}>View exports <ArrowUpRight size={13}/></button></div></div>}
     {outcome?.verified&&!batchInProgress&&!partialGoal&&run?.data.agent_result?.goal&&<div className="saved-plan-card" aria-label="Verified drafting result">
       <div className="section-caption">DRAFTING RESULT · NATIVE CHANGES VERIFIED</div>
       <strong>{verifiedBatchCount>1?`${verifiedBatchCount} verified drafting batches`:run.data.agent_draft?.changes.title?completedDraftTitle(run.data.agent_draft.changes.title):completedGoal}</strong>
       <div className="plan-facts">{Object.entries(run.data.agent_result.changes??{}).filter(([,count])=>count>0).map(([kind,count])=><span key={kind}>{count} {count===1?kind.replace(/s$/,'').replaceAll('_',' '):kind.replaceAll('_',' ')}</span>)}</div>
       <p>{run.data.agent_result.verification??'The recorded native changes were verified in Revit.'}</p>
       {run.data.agent_result.assessment?.nativeStatus==='verified'&&<DraftAssessmentDetails assessment={run.data.agent_result.assessment} batchHistory={run.data.agent_result.batchHistory}/>}
       <details><summary>{run.data.agent_result.goal==='Build this exact drafting task'&&!run.data.agent_draft?.requestedGoal?'Task goal':'Original request'}</summary><p>{completedGoal}</p></details>
       {completedCriteria.length?<details><summary>Requested criteria for your review</summary><ul>{completedCriteria.map((criterion,index)=><li key={index}>{criterion}</li>)}</ul></details>:null}
       <small>Document {run.data.agent_result.documentId?.slice(0,8)??'unknown'} · Operation {run.data.agent_result.operationId?.slice(0,8)??'unknown'} · Project file not saved by DATUMM</small>
       <div className="plan-actions"><Button variant="secondary" onClick={event=>{if(previewSvg)openCanvas(event.currentTarget);else{setRight(true);setTab('preview');}}}>Quick look <ArrowUpRight size={14}/></Button><Button variant="secondary" onClick={()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Post-build feedback"]')?.focus()}>Request changes</Button></div>
     </div>}

     {partialGoal&&<div className="saved-plan-card" role="status" aria-label="Task goal is partially complete">
       <div className="section-caption">TASK OUTCOME · PARTIAL</div>
       <strong>{completedGoal??'The requested outcome remains partially complete.'}</strong>
       <p>{run.data.agent_result?.answer??run.data.answer??'Some requested results remain incomplete.'}</p>
       {run.data.agent_result?.assessment&&<DraftAssessmentDetails assessment={run.data.agent_result.assessment} batchHistory={run.data.agent_result.batchHistory}/>}
       <small>{outcome?.verified?'The recorded native operation is verified; the overall goal still has unmet, unsupported or unverified criteria.':'Task processing ended with an incomplete goal; review the evidence and verification limits before continuing.'}</small>
       {run.data.agent_result?.documentId&&run.data.agent_result?.operationId&&<small>Document {run.data.agent_result.documentId.slice(0,8)} · Operation {run.data.agent_result.operationId.slice(0,8)}</small>}
     </div>}
     {run?.status==='paused_limit'&&<AgentLimit runId={run.id} canContinue={Boolean(run.data.agent_limit?.continuationAvailable)} hasOperation={Boolean(run.data.operation_id)} findings={checkpointFindings} pending={busy||actionBusy} onContinue={()=>void submit(run.data.agent_memory?.originalGoal??(run.data as Run['data']&{prompt?:string}).prompt??run.title,false,run.mode)} onRecover={()=>void act('recover')}/>}
     {run?.status==='paused_recovery'&&<div className="saved-plan-card" role="status"><div className="section-caption">TASK PAUSED</div><strong>Your progress is saved</strong><p>Continue this task from its checkpoint. Any Revit change will need its original exact review or a fresh task scope.</p><div className="plan-actions"><Button disabled={actionBusy} onClick={()=>void act('continue')}>Continue task <ArrowUpRight size={14}/></Button><Button variant="secondary" disabled={actionBusy} onClick={()=>void act('cancel')}>End task</Button></div></div>}
     {run?.status==='reconciling'&&<div className="saved-plan-card" role="status"><div className="section-caption">{verifiedNativeBatches.length===1?'BASE VERIFIED · CHECK ANNOTATIONS':'MODEL STATUS NEEDS CHECKING'}</div><strong>{verifiedNativeBatches.length===1?`${verifiedNativeBatches[0].receipt.elementIds.length} base elements passed read-back`:'The task paused after a Revit operation'}</strong><p>{verifiedNativeBatches.length===1?'The base build is verified. Check the separate annotation rehearsal before preparing its fresh exact review.':'Check the original operation outcome before starting another model change.'} DATUMM will not repeat an uncertain write.</p><div className="plan-actions"><Button variant="secondary" disabled={actionBusy||!run.data.operation_id} onClick={()=>void act('recover')}>Check operation status</Button></div></div>}
     {run&&['failed','interrupted'].includes(run.status)&&run.data.native_batches?.length===1&&run.data.native_batches[0].verified&&<div className="saved-plan-card" role="status"><div className="section-caption">BASE VERIFIED · ANNOTATIONS INCOMPLETE</div><strong>{run.data.native_batches[0].receipt.elementIds.length} base elements passed read-back</strong><p>The base remains recorded as verified. Tags and dimensions have not completed. Inspect the annotation operation before preparing a fresh exact review.</p>{run.data.annotation_view_review&&<small>Proposed annotation view: {run.data.annotation_view_review.name}</small>}</div>}
     {run?.data.error&&!queueData?.failure&&run.status!=='reconciling'&&run.data.error!=='APPROVAL_REQUIRED'&&<div className={cn('error-card',outcome?.verified&&'historical-card')} role={outcome?.verified?'note':'alert'}>{run.data.failure?.code==='annotation_view_inactive'?('Open '+(run.data.annotation_view_review?.name??'the reviewed annotation view')+' in Revit, then refresh annotations. The verified base will not be rebuilt.'):confirmedAnnotationFailure?'The annotation rehearsal failed and rolled back. No annotation changes were retained. The full build remains incomplete.':committedBuild?outcome?.verified?outcome.completedBuild?'The original task reported an error. A later operation-status check verified every created element in the original project.':`The base geometry is verified; the full build remains incomplete. ${run.data.error}`:`Build committed; full verification is unavailable (${run.data.error}). Check the original operation before further model changes.`:run.data.error}{!confirmedAnnotationFailure&&run.data.failure?.recoveryAction&&<small>{recoveryGuidance(run.data.failure.recoveryAction)}</small>}{run.data.operation_id&&<button disabled={actionBusy} onClick={()=>act('recover')}>{outcome?.verifiedBatches===1&&!outcome.completedBuild&&run.status==='failed'?'Refresh annotations':'Check operation status'}</button>}</div>}

     {canRefreshFailedPreparation&&<div className="saved-plan-card" role="status"><strong>Retry preparation</strong><p>A fresh review is required. Preparation can restart only when all earlier rehearsals have confirmed rollback.</p><Button variant="secondary" disabled={actionBusy} onClick={()=>act('refresh-proposal')}>Refresh preparation</Button></div>}
     {canEndFailedPreparation&&!canRefreshFailedPreparation&&<div className="saved-plan-card" role="status"><strong>Rollback confirmed</strong><p>End this failed preparation before reviewing placement and preparing the same accepted plan again. A fresh exact review will be required.</p><Button variant="secondary" disabled={actionBusy} onClick={()=>act('cancel')}>End failed preparation</Button></div>}
     {run?.status==='interrupted'&&!run.data.error&&!outcome?.verified&&<div className="error-card" role="alert">This task was interrupted. Its outcome needs checking.{run.data.operation_id&&<button disabled={actionBusy} onClick={()=>act('recover')}>Check operation status</button>}</div>}
     {run?.data.recovery?.data&&<div className="saved-plan-card" role={outcome?.verified?'note':'status'}><strong>Operation status: {run.data.recovery.data.state??'unconfirmed'}</strong><p>{run.data.recovery.data.sameDocument?'The original project is active.':'The original project is not confirmed active; element verification is unavailable.'}</p>{run.data.recovery.data.elements&&<p>{run.data.recovery.data.elements.filter(element=>!element.missing).length} elements present · {run.data.recovery.data.elements.filter(element=>element.missing).length} missing.</p>}<small>This check made no model changes. Review the result before starting another build.</small></div>}
     {run&&!executing&&<TaskOutcome task={run} onArtifacts={()=>{setRight(true);setTab('exports');}}/>}
    </ConversationContent><ConversationScrollButton aria-label="Jump to latest message"/></Conversation>}


     <div className="composer-area">
      <div className="composer-workflow">
      {desktopLayout&&liveRuntime&&run&&!executing&&(queueData?.design||queueData?.native_build||buildStep)&&dismissedWorkflow!==workflowNoticeKey&&<div className="studio-review-notice" role="status"><span title={workflowState(run).next}>{workflowState(run).label}</span><button type="button" disabled={actionBusy||busy||drawingLoading} onClick={()=>{if(buildStep){setBuildSetupOpen(true);if(planAccepted)void reviewPlacement();}else focusReview(queueData?.native_build?'[aria-label="Native build review"]':'[aria-label="Validated design preview"]');}}>Review<ArrowUpRight size={12}/></button><button type="button" className="studio-notice-close" aria-label="Dismiss workflow notice" onClick={()=>setDismissedWorkflow(workflowNoticeKey)}><X size={13}/></button></div>}
      {!desktopLayout&&liveRuntime&&run&&(queueData?.design||queueData?.native_build||nativeQuestions.length>0)&&<details className="workflow-strip"><summary>{workflowState(run).kind==='in_progress'&&<WorkingIndicator/>}{workflowState(run).label}</summary><p>{workflowState(run).next}</p><small>{run.data.run_manifest?.budget?.calls??'Unavailable'} metered calls / {run.data.run_manifest?.budget?'$'+run.data.run_manifest.budget.reservedUsd.toFixed(4):'Unavailable'} reserved</small></details>}
      {liveRuntime&&promptQueue.length>0&&<div className="prompt-queue" aria-label="Queued prompts"><div className="section-caption">QUEUED · {promptQueue.length}/10 <span>{queueData?.queue_paused?'Paused · prompts saved':'Runs in order after the current turn'}</span></div><ol>{promptQueue.map(item=><li key={item.id}><span><strong>{item.mode==='plan'?'Plan':'Ask'}</strong> <PromptContent text={item.prompt}/></span><button type="button" disabled={actionBusy||Boolean(prompt.trim())} aria-label={`Edit queued prompt: ${item.prompt}`} onClick={()=>void queueAction('edit',item)}>Edit</button><button type="button" disabled={actionBusy} aria-label={`Remove queued prompt: ${item.prompt}`} onClick={()=>void queueAction('remove',item)}><X size={14}/></button></li>)}</ol>{!executing&&<Button variant="secondary" disabled={actionBusy} onClick={()=>void queueAction('resume')}>Resume queue</Button>}</div>}
      {runtimeConfig?.authenticationRequired?<div className="runtime-notice" role="status"><div><strong>Sign in to DATUMM</strong><span>Open Account in Settings. Hosted login must be configured before this release can run agent commands.</span></div><Button variant="secondary" onClick={()=>changeSettingsOpen(true)}>Open Settings</Button></div>:offlineFixture&&!desktopPreview&&<div className="runtime-notice" role="status"><div><strong>Connect a model to start AI chat</strong><span>Settings uses the default .env key when no saved key exists. You can also run {runtimeConfig?.fixturePrompt} to check offline storage.</span></div><Button variant="secondary" onClick={()=>changeSettingsOpen(true)}>Open Settings</Button><Button variant="secondary" disabled={busy||!connected||!runtimeConfig?.fixturePrompt} onClick={()=>void submit(runtimeConfig!.fixturePrompt!,false)}>Run offline check</Button></div>}
     {!desktopLayout&&liveRuntime&&run&&queueData?.design?.candidates.length&&!executing&&queueData.native_build?.state!=='committed'&&(!queueData.design.selected||mode!=='build'||queueData.native_build)&&<div className="build-next-step" role="status"><div><strong>{queueData.native_build?.operationId?'Review original Revit result':queueData.native_build?workflowState(run).label:queueData.design.selected?'Plan accepted':'Plan needs your review'}</strong><span>{queueData.native_build?'Open the saved native proposal or receipt.':queueData.design.selected?'Inspect the current level, placement and loaded types.':'Choose the exact alternative, then continue to measured Revit placement.'}</span></div><Button type="button" disabled={actionBusy||!desktopAvailable} onClick={()=>void continueDesignBuild().catch(error=>setError((error as Error).message))}>{queueData.native_build?.operationId?'Review Revit result':queueData.native_build?'Review native proposal':queueData.design.selected?'Continue to Revit Build':'Review plan & build'} <ArrowUpRight size={15}/></Button></div>}
     {!desktopLayout&&buildStep&&<div className="build-next-step" role="status"><div><strong>Build this saved plan</strong><span>{buildStep==='drawing'?'Loading the exact drawing':buildStep==='accept'?'Next: accept the selected drawing and assumptions':'Next: choose placement and prepare the Revit preview'}</span></div><Button disabled={busy||drawingLoading} onClick={()=>{setBuildSetupOpen(true);if(planAccepted)void reviewPlacement();}}>Continue to Build <ArrowUpRight size={15}/></Button></div>}
      {messageError&&<p className="error-banner" role="alert">{messageError}{blockedChat&&messageError===blockedChat.message+' Your prompt is preserved.'&&<Button type="button" variant="secondary" size="sm" disabled={actionBusy||mediaBusy} onClick={async()=>{const epoch=recoveryEpoch.current;setActionBusy(true);try{const saved=await api<Run>('tasks/'+encodeURIComponent(blockedChat.id));if(epoch===recoveryEpoch.current){selectRun(saved);setError('');setBlockedChat(null);}}catch(failure){if(epoch===recoveryEpoch.current)setError((failure as Error).message);}finally{setActionBusy(false);}}}>Open active chat</Button>}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={14}/></button></p>}
     {connectionNotice&&<p className="connection-notice" role="status">{connectionNotice}<button type="button" className="icon-button" aria-label="Dismiss connection notice" onClick={()=>setConnectionNotice('')}><X size={14}/></button></p>}
      </div>
     <div className="workspace-controls"><div className="header-actions">{mode!=='build'&&!offlineFixture&&<button type="button" className={cn('context-toggle',useCurrentModel&&'active')} aria-label={useCurrentModel?'Revit context on':'Revit context'} aria-pressed={useCurrentModel} disabled={busy} onClick={()=>setUseCurrentModel(value=>!value)} title="Include measured Revit context in this request"><Box size={13}/>{useCurrentModel?'Revit context on':'Revit context'}</button>}<button className="device-status" disabled={offlineFixture} onClick={event=>{dialogTrigger.current=event.currentTarget;setDeviceDialog(true);}}><span className={cn('connection-dot',selectedDevice?.online&&revitSessions===1&&'online')}/><span>{offlineFixture?'Revit unavailable':!selectedDevice?.online?'Connect Revit':revitSessions===1?'Revit ready':revitSessions===0?'Enable Revit bridge':'Checking Revit'}</span><ChevronDown size={12}/></button></div></div>
     <form className="composer" onSubmit={e=>{e.preventDefault();void submit(prompt,mode==='build'&&prompt.toLowerCase().includes('verified 3bhk'));}}>
      {draftReferences.length>0&&<div className="saved-source-strip" aria-label="Draft design references">{draftReferences.map((row,i)=><span className="draft-reference-chip" key={i}>{row.target.kind==='source'?'Source region':row.target.key} / {row.intent} / {row.fingerprint.slice(0,10)}{queueData?.design?.candidates.some(candidate=>candidate.fingerprint===row.fingerprint)?'':' / saved version, review against current geometry'}</span>)}</div>}
      {commandsOpen&&<div className="slash-commands" id="workflow-commands" role="listbox" aria-label="Workflow commands">{commandMatches.map((command,index)=><button type="button" role="option" aria-selected={index===commandIndex} id={`workflow-${index}`} key={command} onClick={()=>chooseCommand(command)}>/{command}<small>{command==='inspect'?'Read current Revit evidence':command==='plan'?'Prepare a proposed design':command==='compare'?'Compare saved versions':command==='verify'?'Read recorded native outcome':'Save context for the next turn'}</small></button>)}</div>}
      <textarea aria-label="Message DATUMM" value={visiblePrompt.references.length?visiblePrompt.text:prompt} onChange={e=>{setPrompt(visiblePrompt.references.length?withViewportReferences(e.target.value,visiblePrompt.references):e.target.value);setCommandIndex(0);setCommandsDismissed(false);}} aria-controls={commandsOpen?'workflow-commands':undefined} aria-activedescendant={commandsOpen?`workflow-${commandIndex}`:undefined} placeholder={desktopLayout?(hasContent?'Ask about this plan, or describe a change…':'Describe your project, or ask anything…'):offlineFixture?`Offline check: ${runtimeConfig?.fixturePrompt}`:mode==='build'?'Describe what you want to build…':mode==='plan'?'What space do you have in mind?':'Ask about your design or Revit model…'} rows={2} onKeyDown={e=>{if(commandsOpen&&!e.nativeEvent.isComposing){if(e.key==='Escape'){e.preventDefault();setCommandsDismissed(true);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setCommandIndex(index=>(index+(e.key==='ArrowDown'?1:commandMatches.length-1))%commandMatches.length);return;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();chooseCommand(commandMatches[commandIndex]??commandMatches[0]);return;}}if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&(sendShortcut==='enter'||e.ctrlKey||e.metaKey)){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>

      {visiblePrompt.references.length>0&&<ViewportReferences references={visiblePrompt.references} onChange={references=>setPrompt(withViewportReferences(visiblePrompt.text,references))}/>}
      <div className="composer-toolbar">{desktopLayout&&<div className="studio-attachment-control">      <ComposerMedia attachmentOnly locked={mediaBusy} nativeAvailable={desktopAvailable} key={sourceKey} sources={sources} onChange={setSources} onBusy={setMediaBusy} onTranscript={text=>setPrompt(previous=>previous+(previous?'\n':'')+text)} disabled={actionBusy||!liveRuntime&&!desktopPreview} onContext={()=>setProjectContextOpen(true)} onTools={()=>{changeSettingsOpen(true);}} onSettings={()=>changeSettingsOpen(true)} onSkill={id=>setPrompt(previous=>previous+'\nUse the reviewed native skill '+id+'.')} onCommand={command=>{if(command==='plan')setMode('plan');setPrompt('/'+command+' '+prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/,''));document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();}}/></div>}{desktopLayout?<DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button type="button" className="studio-mode-trigger" aria-label="Task mode" disabled={busy||mediaBusy||!workspaceReady}>{modes.find(item=>item.id===mode)?.label??mode}<ChevronDown size={12}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu" side="top" align="start">{modes.map(item=><DropdownMenuPrimitive.Item key={item.id} disabled={busy||mediaBusy||!workspaceReady||buildUnavailable&&item.id==='build'} onSelect={()=>{if(item.id==='build'&&run?.data.agent_design&&drawingCurrent&&!run.data.compiled&&!run.data.operation_id)void switchDrawingToBuild();else setMode(item.id);}}><item.icon size={14}/>{item.label}{item.id===mode&&<Check size={13}/>}</DropdownMenuPrimitive.Item>)}</DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root>:<div className="mode-selector" role="group" aria-label="Agent mode">{modes.map(m=><button key={m.id} type="button" className={cn(mode===m.id&&'active')} onClick={()=>{if(m.id==='build'&&run?.data.agent_design&&drawingCurrent&&!run.data.compiled&&!run.data.operation_id)void switchDrawingToBuild();else setMode(m.id);}} disabled={busy||mediaBusy||!workspaceReady||buildUnavailable&&m.id==='build'} title={buildUnavailable&&m.id==='build'?'Native Build is not enabled; Ask and Plan are read-only':undefined} aria-pressed={mode===m.id}><m.icon size={13}/>{m.label}</button>)}</div>}

         <div className="composer-right"><div className="studio-model-control">{desktopAvailable&&!chatModels.length?<Button type="button" variant="ghost" size="sm" onClick={()=>changeSettingsOpen(true)}>Connect models</Button>:(desktopLayout||!offlineFixture||desktopAvailable)&&<ModelPicker model={model} models={chatModels} reasoningEffort={reasoningEffort} onModelChange={value=>{modelPreferenceInitialized.current=true;setModel(value);}} onReasoningEffortChange={value=>{modelPreferenceInitialized.current=true;setReasoningEffort(value);}} disabled={actionBusy||mediaBusy||busy&&!queueMessage||offlineFixture&&!desktopAvailable}/>}</div>{desktopAvailable&&chatModels.length>0&&!chatModels.includes(model)&&<small role="status">Selected model unavailable · choose a model</small>}{desktopLayout&&<div className="studio-voice-control">      <ComposerMedia voiceOnly voiceStatus={providerStatus?.voice} locked={mediaBusy} nativeAvailable={desktopAvailable} key={sourceKey} sources={sources} onChange={setSources} onBusy={setMediaBusy} onTranscript={text=>setPrompt(previous=>previous+(previous?'\n':'')+text)} disabled={actionBusy||!liveRuntime&&!desktopPreview} onContext={()=>setProjectContextOpen(true)} onTools={()=>{changeSettingsOpen(true);}} onSettings={()=>changeSettingsOpen(true)} onSkill={id=>setPrompt(previous=>previous+'\nUse the reviewed native skill '+id+'.')} onCommand={command=>{if(command==='plan')setMode('plan');setPrompt('/'+command+' '+prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/,''));document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();}}/></div>}{executing&&<button type="button" className="send-button" aria-label={liveRuntime?'Stop execution':'Pause task'} onClick={()=>liveRuntime?void queueAction('stop'):void act('pause')} disabled={!run||actionBusy}><Square size={13} fill="currentColor"/></button>}{(!executing||liveRuntime)&&<button className="send-button" type="submit" disabled={!hasPromptContent(prompt)||!workspaceReady||!connected||actionBusy||mediaBusy||executing&&!run} aria-label={queueMessage?'Queue message':'Send message'} title={queueMessage?'Save this prompt to run after the current turn':'Send message'}><ArrowUp size={18}/></button>}</div>
      </div>
     </form>{desktopLayout&&!hasContent&&<div className="studio-new-chat-context"><span>Hosted workspace</span><span>{selectedDevice?.online&&revitSessions===1?contextView:'Revit not connected'}</span></div>}{desktopLayout&&<div className="studio-composer-meta"><span title={model}>{model.split('/').at(-1)} · {reasoningEffort} · next message</span><span>Hosted conversation context</span></div>}{desktopLayout&&!hasContent&&<><div className="studio-new-chat-suggestions"><button type="button" disabled={!workspaceReady} onClick={()=>{setMode('plan');setPrompt('Help me design a floor plan. Ask for the site dimensions and room requirements first.');}}><PencilRuler size={14}/>Generate a plan</button><button type="button" disabled={!workspaceReady} onClick={()=>{setMode('ask');setUseCurrentModel(true);setPrompt('Inspect the active Revit model and summarize the measured evidence.');}}><Workflow size={14}/>Review my model</button><button type="button" disabled={!workspaceReady} onClick={()=>{setMode('ask');setPrompt('Help me annotate a drawing. Ask which drawing and annotations I need.');}}><Pencil size={14}/>Annotate a drawing</button></div><p className="studio-new-chat-assurance">Think, plan, review. You approve changes before they reach Revit.</p></>}
    </div>

   </div>

    <footer className="main-footer"><span><span className={cn('connection-dot',connected&&selectedDevice?.online&&revitSessions===1&&'online')}/>{!workspaceReady?'Connecting to DATUMM':!connected?'DATUMM unavailable':offlineFixture?'Offline check ready · AI and Revit unavailable':selectedDevice?.online&&revitSessions===1?'Revit connected':'Models connected · Revit not connected'}</span><span>{mode==='build'?'Revit changes require approval':'Hosted conversation context'}</span></footer>

  </main>
  );
  const activeDrawing=plannedCandidate?candidateDrawing(plannedCandidate):designVersion;
  const selectedActivityRun=runs.find(item=>item.id===activitySelection)??run??runs[0];
  const activityRun=selectedActivityRun?.id===run?.id?run:selectedActivityRun;
  const activityRuns=runs.filter(item=>activityFilter==='all'||(activityFilter==='done'?item.status==='completed':workflowState(item).kind===activityFilter));
  const activityView=activityRun?latestTaskActivity(activityRun,activityRun.id===run?.id?events:activityRun.events):null;
  const currentActivity=run?latestTaskActivity(run,events):null;
  const generalSettingsContent=<div className="settings-general" aria-label="General preferences">
   <label className="setting-row"><span><strong>Send messages with</strong><small>Choose how you send a multiline request.</small></span><select aria-label="Send messages with" value={sendShortcut} disabled={mediaBusy} onChange={event=>{setSendShortcut(event.target.value);localStorage.setItem('datumm-send-shortcut',event.target.value);}}><option value="ctrl-enter">Ctrl + Enter</option><option value="enter">Enter</option></select></label>
   <label className="setting-row"><span><strong>Follow-up messages</strong><small>Finish the current run before sending another request.</small></span><select aria-label="Follow-up behavior" value="wait" disabled><option value="wait">Wait for the current run</option></select></label>
   <label className="setting-row"><span><strong>Canvas input</strong><small>Keep a floating assistant input on the drawing.</small></span><input type="checkbox" aria-label="Floating canvas input" checked={canvasInputEnabled} disabled={mediaBusy} onChange={event=>{setCanvasInputEnabled(event.target.checked);localStorage.setItem('datumm-canvas-input',String(event.target.checked));}}/></label>
   <label className="setting-row"><span><strong>Persistent properties</strong><small>Always show essential details below your drawing.</small></span><input type="checkbox" aria-label="Persistent properties" checked={persistentProperties} onChange={event=>{setPersistentProperties(event.target.checked);localStorage.setItem('datumm-persistent-properties',String(event.target.checked));}}/></label>
   <label className="setting-row"><span><strong>Units</strong><small>Measurements and dimensions use the current geometry units.</small></span><select aria-label="Measurement units" value="mm" disabled><option value="mm">Millimetres</option></select></label>
  </div>;
  const showDesktopAssistant=hasContent||studioView!=='workspace';
  if(needsAccountAdmission)return <AccountAdmission status={accountStatus} statusError={accountStatusError} actionError={accountActionError} busy={accountBusy} workspaceLoading={accountWorkspaceLoading} onSignIn={()=>void accountAction('signIn')} onCancel={()=>void accountAction('signOut')} onRetry={()=>void accountAction('status')}/>;
  return <>{desktopLayout&&<DesktopTitlebar settingsOpen={settingsOpen} leftWidth={panelWidths.left} nativeAvailable={desktopAvailable} onSettings={()=>changeSettingsOpen(true)} left={left} right={right} onToggleLeft={toggleLeft} onToggleRight={toggleRight} title={run?.title??'New chat'} project={currentProject?.title} options={<details className="studio-titlebar-options" onKeyDown={event=>{if(event.key==='Escape')event.currentTarget.open=false;}}><summary aria-label="Workspace options" title="Workspace options"><Ellipsis size={17}/></summary><div><DemoMode disabled={!desktopAvailable||busy||buildUnavailable} sessionId={deviceId||undefined} onComplete={task=>{selectRun(task);setRight(true);setTab('preview');void refresh();}}/>{chatOptions}</div></details>}/>}<div className={cn('workspace',desktopLayout&&'desktop-workspace',desktopLayout&&!showDesktopAssistant&&'studio-new-chat',desktopLayout&&hasContent&&studioView==='workspace'&&'studio-has-pipeline',desktopLayout&&settingsOpen&&'studio-settings-open',desktopLayout&&studioView!=='workspace'&&'studio-secondary-view',!left&&'left-closed',!right&&'right-closed',viewportReady&&'viewport-ready')} style={{'--left-panel-width':`${panelWidths.left}px`,'--right-panel-width':`${panelWidths.right}px`} as React.CSSProperties}>

  {desktopLayout&&settingsOpen&&<header className="studio-settings-header"><div><h1>Settings</h1><p>Preferences for your architectural workspace</p></div><span className="studio-settings-connection"><i className={selectedDevice?.online?'connected':''}/>{selectedDevice?.online?'Revit connected':'Revit not connected'}</span></header>}
  {accountExpired&&<div className="runtime-notice" role="alert"><div><strong>DATUMM session expired</strong><span>{accountActionError||accountStatus?.error||'Your saved workspace stays available. Refresh your account before submitting new work.'}</span></div><Button variant="secondary" disabled={accountBusy} onClick={()=>void accountAction('refreshAuth')}>{accountBusy?'Refreshing…':'Retry account'}</Button></div>}
  {!desktopLayout&&<div className="workspace-panel-controls" role="group" aria-label="Workspace panels"><button className="icon-button" aria-label={left?'Hide sidebar':'Show sidebar'} title={left?'Hide left sidebar':'Show left sidebar'} aria-expanded={left} aria-controls={left?'workspace-sidebar':undefined} onClick={toggleLeft}>{left?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button><button className="icon-button" aria-label={right?'Hide inspector':'Show inspector'} title={right?'Hide right inspector':'Show right inspector'} aria-expanded={right} aria-controls={right?'workspace-inspector':undefined} onClick={toggleRight}>{right?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}</button></div>}
  {left&&viewportReady&&<button className="sidebar-backdrop" aria-label="Close task navigation" onClick={()=>setLeft(false)}/>}
  {left&&<aside id="workspace-sidebar" className="sidebar"><PanelResize side="left" width={panelWidths.left} onChange={value=>resizePanel('left',value)}/>

   {desktopLayout&&<div className="studio-nav-caption">WORKSPACE<button type="button" className="icon-button" aria-label="Collapse navigation" onClick={toggleLeft}><PanelLeftClose size={15}/></button></div>}
   {!desktopLayout&&<div className="brand"><Mark/><span>DATUMM</span></div>}

   <button className="new-task" onClick={()=>newTask()} disabled={mediaBusy||actionBusy}><Plus size={17}/> New chat <span>Ctrl+N</span></button>

   <label className="search"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search anything" aria-label="Search tasks"/><Search size={16}/></label>{desktopLayout&&<nav className="studio-navigation" aria-label="Workspace views"><button type="button" aria-current={studioView==='schedules'?'page':undefined} onClick={()=>setStudioView('schedules')}><Clock3 size={17}/>Scheduled tasks</button><button type="button" aria-current={studioView==='activity'?'page':undefined} onClick={()=>setStudioView('activity')}><Workflow size={17}/>Activity<span>{runs.filter(item=>workflowState(item).kind==='in_progress').length||''}</span></button></nav>}


   <div className="history" role="region" aria-label={historyView==='archived'?'Archived chats':'Recent tasks'} tabIndex={0}>
    {filteredChats.some(item=>item.pinned_at)&&<section className="chat-group"><div className="sidebar-section"><Pin size={13}/><span>Pinned</span></div>{filteredChats.filter(item=>item.pinned_at).map(chatRow)}</section>}
    {desktopAvailable&&<section className="project-groups"><div className="sidebar-section"><FolderOpen size={13}/><span>Projects</span><button className="icon-button" aria-label="Projects & local files" onClick={()=>setProjectContextOpen(true)}><Plus size={15}/></button></div>{orderedProjects.map(project=><section key={project.id} className="project-group"><div className="project-group-heading"><button className="project-group-toggle" aria-expanded={!collapsedProjects.includes(project.id)} onClick={()=>{const value=collapsedProjects.includes(project.id)?collapsedProjects.filter(id=>id!==project.id):[...collapsedProjects,project.id];setCollapsedProjects(value);localStorage.setItem('datumm-collapsed-projects',JSON.stringify(value));}}>{collapsedProjects.includes(project.id)?<Folder size={16}/>:<FolderOpen size={16}/>}<span title={project.title}>{project.title}</span></button><DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button className="icon-button" aria-label={`Options for project ${project.title}`}><Ellipsis size={14}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu"><DropdownMenuPrimitive.Item onSelect={()=>newTask(project.id)}><Plus size={14}/>New chat in project</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>{setRenameTitle(project.title);setRenameTarget({kind:'project',id:project.id,title:project.title,revision:project.revision});}}><Pencil size={14}/>Rename project</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>{const order=[project.id,...orderedProjects.filter(row=>row.id!==project.id).map(row=>row.id)];setProjectOrder(order);localStorage.setItem('datumm-project-order',JSON.stringify(order));}}>Move to top</DropdownMenuPrimitive.Item></DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root></div>{(!collapsedProjects.includes(project.id)||Boolean(search))&&<div className="project-chats">{filteredChats.filter(item=>item.projectId===project.id&&!item.pinned_at).map(chatRow)}{!filteredChats.some(item=>item.projectId===project.id)&&<button className="project-empty" onClick={()=>newTask(project.id)}><Plus size={12}/>New chat</button>}</div>}</section>)}</section>}
    {<section className="chat-group"><div className="sidebar-section"><span>{historyView==='archived'?'Archived chats':'Recent chats'}</span><DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button className="icon-button" aria-label="Chat filters"><Ellipsis size={15}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu"><DropdownMenuPrimitive.Item onSelect={()=>setProjectContextOpen(true)}><FolderOpen size={14}/>Projects & local files</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Separator/>{[['','All chats'],['in_progress','In progress'],['needs_input','Needs input'],['ready_review','Ready for review']].map(([id,label])=><DropdownMenuPrimitive.Item key={id} onSelect={()=>setWorkflowFilter(id)}>{workflowFilter===id?<Check size={14}/>:<span className="menu-spacer"/>}{label}</DropdownMenuPrimitive.Item>)}</DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root></div>{filteredChats.filter(item=>!item.pinned_at&&(!desktopAvailable||normalChat(item))).map(chatRow)}</section>}
    {!filteredChats.length&&<p className="empty-history">{search?'No matching chats.':historyView==='archived'?'No archived chats.':'Start a chat to save your work.'}</p>}
   </div>

   <div className="sidebar-bottom"><div className="desktop-account-footer"><button type="button" className="studio-sidebar-settings" onClick={()=>changeSettingsOpen(true)}><Settings2 size={17}/>Settings<kbd>Ctrl ,</kbd></button><AccountFooter authConfigured={authConfigured} openConnections={()=>setDeviceDialog(true)} openArchived={()=>setHistoryView(historyView==='recent'?'archived':'recent')} confirmDeleteAll={()=>{setDeletePhrase('');setDeleteAllOpen(true);}}/></div></div>

  </aside>}

  {desktopLayout&&!left&&<nav className="studio-nav-rail" aria-label="Collapsed navigation"><button type="button" aria-label="Expand navigation" title="Expand navigation" onClick={toggleLeft}><PanelLeftOpen size={18}/></button><button type="button" aria-label="New chat" title="New chat" disabled={mediaBusy||actionBusy} onClick={()=>newTask()}><Plus size={19}/></button><button type="button" aria-label="Activity" title="Activity" onClick={()=>setStudioView('activity')}><Workflow size={18}/></button><button type="button" aria-label="Scheduled tasks" title="Scheduled tasks" onClick={()=>setStudioView('schedules')}><Clock3 size={18}/></button><button type="button" aria-label="Settings" title="Settings" onClick={()=>changeSettingsOpen(true)}><Settings2 size={18}/></button></nav>}
  <Dialog open={Boolean(renameTarget)} onOpenChange={open=>{if(!open&&!actionBusy)setRenameTarget(null);}}><DialogContent><DialogHeader><DialogTitle>Rename {renameTarget?.kind}</DialogTitle><DialogDescription>Change the display name. Saved context and original requests stay attached.</DialogDescription></DialogHeader><form className="context-form" onSubmit={async event=>{event.preventDefault();if(!renameTarget||actionBusy)return;setActionBusy(true);setError('');try{await api(`${renameTarget.kind==='project'?'projects':'tasks'}/${renameTarget.id}/title`,'POST',{title:renameTitle,...(renameTarget.kind==='project'?{expectedRevision:renameTarget.revision}:{expectedTaskVersion:renameTarget.revision})});await refresh();if(runId===renameTarget.id)setRun(await api<Run>('tasks/'+runId));setRenameTarget(null);}catch(e){setError((e as Error).message);}finally{setActionBusy(false);}}}><label>Display name<input autoFocus aria-label="Display name" value={renameTitle} onChange={e=>setRenameTitle(e.target.value)} maxLength={120}/></label><Button disabled={actionBusy||!renameTitle.trim()}>Save name</Button>{error&&<p role="alert">{error}</p>}</form></DialogContent></Dialog>
  <Dialog open={accessDialog} onOpenChange={open=>{setAccessDialog(open);if(!open)setAccessReview(null);}}>
   <DialogContent className="task-access-dialog" onCloseAutoFocus={restoreDialogFocus}>
    <DialogHeader><DialogTitle>Task Full Access</DialogTitle><DialogDescription>Choose finite limits for this project and task. DATUMM will still dry-run and verify each native batch, stop at the limits, and never save the project.</DialogDescription></DialogHeader>
    <div className="task-access-fields">
     <label>Verified batches
      <select value={accessBatches} onChange={event=>{const count=Number(event.target.value);setAccessBatches(count);if(count===1)setAccessMargin(0);setAccessReview(null);}}>
       <option value={plannedAccessBatches}>{plannedAccessBatches} {plannedAccessBatches===1?'batch':'batches'}</option>
      </select>
     </label>
     {accessBatches>1&&<label>Additional geometry margin
      <select value={accessMargin} onChange={event=>{setAccessMargin(Number(event.target.value));setAccessReview(null);}}>
       {[0,5000,10000,20000].map(value=><option key={value} value={value}>{value===0?'No margin':`${value/1000} m beyond first preview`}</option>)}
      </select>
     </label>}
    </div>
    <p className="task-access-note">Only the first proposal’s operation kinds, Revit types and exact existing-element edits are allowed. The selected margin expands its XY envelope; it does not allow deletion. Access expires after 30 minutes or the approved batch count.</p>
    <Button variant="secondary" disabled={actionBusy} onClick={()=>void reviewTaskAccess()}>Review exact limits</Button>
    {accessReview&&accessReview.runId===run?.id&&<div className="task-access-scope" role="status">
     <strong>{accessReview.commits} {accessReview.commits===1?'batch':'batches'} · {run?.data.context?.title??'Current project'}</strong>
     <span>Allowed: {accessReview.scope.operationKinds.join(', ')} · {accessReview.scope.typeIds.length} native type {accessReview.scope.typeIds.length===1?'ID':'IDs'}</span>
     <span>Per batch: {accessReview.scope.maxOperations} operations, {accessReview.scope.maxElements} elements. Total: {accessReview.scope.maxTotalOperations??accessReview.scope.maxOperations} operations, {accessReview.scope.maxTotalElements??accessReview.scope.maxElements} elements.</span>
     <span>XY bounds (mm): {accessReview.scope.boundsMm?`X ${accessReview.scope.boundsMm.x[0]} to ${accessReview.scope.boundsMm.x[1]}; Y ${accessReview.scope.boundsMm.y[0]} to ${accessReview.scope.boundsMm.y[1]}`:'Exact edited targets only'}.</span>
     <small>Document {accessReview.scope.documentId.slice(0,8)} · Level {accessReview.scope.levelId.slice(0,8)} · Scope {accessReview.fingerprint.slice(0,12)}…</small>
    </div>}
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <div className="dialog-actions"><Button variant="secondary" onClick={()=>setAccessDialog(false)}>Cancel</Button><Button disabled={actionBusy||accessReview?.runId!==run?.id} onClick={()=>void enableTaskAccess()}>Enable reviewed scope</Button></div>
   </DialogContent>
  </Dialog>

  <Dialog open={buildSetupOpen&&Boolean(buildStep)} onOpenChange={setBuildSetupOpen}><DialogContent className="build-setup-dialog" onCloseAutoFocus={restoreDialogFocus}><DialogHeader><DialogTitle>Build this plan in Revit</DialogTitle><DialogDescription>Keep this exact drawing. Choose its placement, then review Revit’s preview before approving model changes.</DialogDescription></DialogHeader>
   <ol className="build-flow-steps" aria-label="Plan to Build progress"><li aria-current={!planAccepted?'step':undefined}>1. {planAccepted?'Plan accepted':'Accept plan'}</li><li aria-current={planAccepted?'step':undefined}>2. Revit placement</li><li>3. Preview and approve</li></ol>
   {designVersion&&drawingCurrent&&<div className="build-plan-summary"><img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(designVersion.svg)} alt={`Selected plan version ${designVersion.version}`}/><span>Alternative {(run?.data.agent_design?.candidates.findIndex(c=>c.planId===designVersion.planId)??-1)+1} · version {designVersion.version}<small>{planAccepted?'Accepted drawing':'The displayed drawing will be used'}</small></span></div>}
   {!drawingCurrent||drawingError?<p role="alert">Load the current exact drawing before continuing. <Button onClick={()=>setDrawingRetry(n=>n+1)}>Retry drawing</Button></p>:!planAccepted?<><p>Accept this drawing and its assumptions to continue to placement.</p><ul className="build-assumptions">{reviewAssumptions.map((item,index)=><li key={index}>{item}</li>)}</ul><Button disabled={busy||drawingLoading||!selectedDevice?.online||revitSessions!==1} onClick={()=>void acceptDrawing()}>{actionBusy?<Loader2 className="spin" size={15}/>:null}Accept plan and choose placement</Button></>:<section aria-label="Native placement review">
    {placementTask!==run?.id||!placementContext?<><p>Read the active Revit project and available plan views.</p><Button disabled={busy||!selectedDevice?.online||revitSessions!==1} onClick={()=>void reviewPlacement()}>{actionBusy?<Loader2 className="spin" size={15}/>:null}Choose Revit placement</Button></>:<><p className="build-project"><Monitor size={16}/><strong>{placementContext.title}</strong><span>Revision {placementContext.revision}</span></p><label>Plan view and level<select aria-label="Native plan view" value={placementView} onChange={e=>{setPlacementView(e.target.value);setConfirmedPlacement(null);}}><option value="">Choose plan view and level</option>{placementContext.plans.map(v=><option key={v.id} value={v.id}>{v.name} · {placementContext.levels.find(l=>l.id===v.levelId)?.name??v.levelId}</option>)}</select></label><div className="build-placement-fields"><label>Origin X (mm)<input aria-label="Origin X (mm)" inputMode="decimal" value={placementX} onChange={e=>{setPlacementX(e.target.value);setConfirmedPlacement(null);}}/></label><label>Origin Y (mm)<input aria-label="Origin Y (mm)" inputMode="decimal" value={placementY} onChange={e=>{setPlacementY(e.target.value);setConfirmedPlacement(null);}}/></label><label>Rotation (degrees)<input aria-label="Rotation (degrees)" inputMode="decimal" value={placementRotation} onChange={e=>{setPlacementRotation(e.target.value);setConfirmedPlacement(null);}}/></label></div><p>Coordinates use Revit’s internal origin. Confirm the intended location; DATUMM will check the geometry in a temporary preview.</p><Button disabled={busy||!placementView} onClick={()=>void confirmPlacement()}>{actionBusy?<Loader2 className="spin" size={15}/>:null}Confirm placement and prepare preview</Button></>}
   </section>}
   {planAccepted&&placementContext&&placementView&&<p>Build level: {placementContext.levels.find(l=>l.id===placementContext.plans.find(v=>v.id===placementView)?.levelId)?.name} · elevation {placementContext.levels.find(l=>l.id===placementContext.plans.find(v=>v.id===placementView)?.levelId)?.elevationMm} mm from Revit’s internal origin. Wall heights and opening sills are relative to this level.</p>}
   {(!selectedDevice?.online||revitSessions!==1)&&<p role="status">Connect one Revit session to continue. <Button variant="secondary" onClick={()=>{setBuildSetupOpen(false);setDeviceDialog(true);}}>Open Connections</Button></p>}
   {(error||drawingError)&&<p className="error-banner" role="alert">{error||drawingError}</p>}
  </DialogContent></Dialog>

  {desktopLayout&&<header className="studio-artifact-header"><div className="studio-heading"><div><h1>{studioView==='activity'?'Activity':studioView==='schedules'?'Scheduled tasks':run?.title??'New chat'}</h1><p>{studioView==='workspace'?(currentProject?.title??'Architectural workspace')+(activeDrawing?` · Proposed design v${activeDrawing.version}`:' · Your next idea starts here'):studioView==='activity'?'Saved runs, public tool evidence and outcomes':'Scheduling capabilities'}</p></div>{studioView==='workspace'&&run&&<span className="studio-status" data-state={workflowState(run).kind}>{workflowState(run).label}</span>}</div><div className="studio-artifact-actions"><button type="button" className="studio-connection" onClick={()=>setDeviceDialog(true)}><span className={cn('connection-dot',selectedDevice?.online&&revitSessions===1&&'online')}/>{selectedDevice?.online&&revitSessions===1?'Revit connected':'Connect Revit'}</button>{hasContent&&studioView==='workspace'&&<Button className="studio-review-primary" onClick={()=>focusReview(queueData?.native_build?'[aria-label="Native build review"]':queueData?.design?'[aria-label="Validated design preview"]':'.conversation')}><Check size={15}/>Review {queueData?.native_build?'proposal':'design'}</Button>}</div></header>}
  {!desktopLayout?conversationPanel:<section className="studio-stage" aria-label="Architectural workspace">
   {studioView==='activity'?<div className="studio-page"><div className="studio-page-heading"><div><h2>Your workspace, in motion</h2><p>Open a run to inspect its conversation, tools and recorded result.</p></div><ContextUsage usage={activityView?.usage} busy={activityView?.active}/></div><div className="studio-filter-tabs" role="group" aria-label="Filter activity">{[['all','All runs'],['in_progress','Running'],['needs_input','Needs input'],['ready_review','Needs review'],['done','Completed']].map(([value,label])=><button type="button" key={value} aria-pressed={activityFilter===value} onClick={()=>setActivityFilter(value)}>{label}</button>)}</div><div className="studio-activity-layout"><div className="studio-run-list">{activityRuns.length?activityRuns.map(item=><button type="button" key={item.id} disabled={mediaBusy||actionBusy} aria-pressed={activityRun?.id===item.id} onClick={()=>setActivitySelection(item.id)}><span className="studio-run-icon"><Workflow size={19}/></span><span><strong>{item.title}</strong><small>{item.mode} · {item.model}</small></span><span className="studio-status" data-state={workflowState(item).kind}>{workflowState(item).label}</span><ChevronRight size={16}/></button>):<div className="studio-empty"><Workflow size={28}/><h2>No runs in this view</h2><p>Your saved tasks will appear here as you work.</p></div>}</div><aside className="studio-activity-detail" aria-label="Selected activity details">{activityRun&&activityView?<><h3>{activityRun.title}</h3><p>{workflowState(activityRun).next}</p><span className="studio-status" data-state={workflowState(activityRun).kind}>{workflowState(activityRun).label}</span><dl><div><dt>Mode</dt><dd>{activityRun.mode}</dd></div><div><dt>Model</dt><dd>{activityRun.model}</dd></div><div><dt>Tool results</dt><dd>{activityView.evidence.length}</dd></div></dl><ActivitySummary events={activityView.events}/><AgentActivity nativeMessages={activityView.active?activityView.nativeMessages:undefined} events={activityView.events} active={activityView.active} waiting={activityView.waiting} mode={activityRun.mode} model={activityRun.model} todos={activityView.todos} manifest={activityView.manifest} evidence={activityView.evidence} showFeed={false}/><Button variant="secondary" disabled={mediaBusy||actionBusy} onClick={()=>selectRun(activityRun)}>Open chat<ArrowUpRight size={14}/></Button>{desktopAvailable&&<PipelineTrace taskId={activityRun.id}/>}</>:<p>Select a task to inspect its recorded work.</p>}</aside></div></div>:studioView==='schedules'?<div className="studio-page"><div className="studio-page-heading"><div><h2>Scheduled tasks</h2><p>Keep recurring work together.</p></div><Button variant="secondary" disabled title="Calendar scheduling is not available in the current runtime"><Plus size={15}/>Create schedule</Button></div><div className="studio-empty studio-schedule-empty"><Clock3 size={30}/><h2>Calendar scheduling is not available yet</h2><p>Recurring calendar runs are unavailable in the hosted workspace.</p><Button variant="secondary" onClick={()=>{setStudioView('activity');setActivityFilter('in_progress');}}>View running tasks<ArrowUpRight size={15}/></Button></div>{run?.data.agent_scheduler&&<AgentScheduler value={run.data.agent_scheduler}/>}</div>:!hasContent?conversationPanel:<div className="studio-canvas-stage">{activeDrawing?<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} key={activeDrawing.fingerprint} drawing={activeDrawing} label="Workspace design" selectedElement={selectedDesignElement} onProperties={()=>{setRight(true);setTab('preview');}} onStyleChange={setDrawingStyle} highlights={designHighlights} onSelectElement={setSelectedDesignElement} source={selectedSource?.image?{id:selectedSource.id,sha256:selectedSource.sha256,name:selectedSource.name,image:selectedSource.image,page:selectedSource.page}:undefined} reference={queueData?.design?.reference} onAsk={askFromCanvas} voiceControl={onTranscript=><ComposerMedia voiceOnly voiceStatus={providerStatus?.voice} locked={mediaBusy} nativeAvailable={desktopAvailable} sources={sources} onChange={setSources} onBusy={setMediaBusy} disabled={actionBusy||!liveRuntime&&!desktopPreview} onTranscript={onTranscript} onContext={()=>setProjectContextOpen(true)} onTools={()=>changeSettingsOpen(true)} onSettings={()=>changeSettingsOpen(true)} onSkill={()=>{}} onCommand={()=>{}}/>}/>:previewSvg?<div className="studio-static-preview"><div className="studio-preview-label"><PencilRuler size={16}/>{previewLabel}</div><img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(previewSvg)}/></div>:<div className="studio-empty"><Layers3 size={36}/><h2>{executing?'Your workspace is taking shape':'A place for your next idea'}</h2><p>{executing?'Follow the assistant as it inspects evidence and prepares your plan.':'Proposed 2D plans and 3D cutaways appear here when saved geometry is available.'}</p><Button variant="secondary" onClick={()=>{setRight(true);setTab('assistant');}}>Open assistant<ArrowUpRight size={15}/></Button></div>}</div>}
  </section>}
   {desktopLayout&&hasContent&&studioView==='workspace'&&<details className="studio-pipeline"><summary><Workflow size={15}/><span>Pipeline</span><span className="studio-pipeline-steps">{studioPipeline({planReady:Boolean(activeDrawing),accepted:Boolean(queueData?.design?.selected||planAccepted),build:queueData?.native_build,executing}).map(step=><span key={step.label} data-state={step.state}>{step.state==='done'?<Check size={12}/>:step.state==='current'?<i aria-hidden="true"/>:null}{step.label}</span>)}</span><strong className="studio-pipeline-status">{run?workflowState(run).label:executing?'Working':'Conversation'}</strong>{executing&&<WorkingIndicator/>}<ChevronDown size={14}/></summary><div>{run&&<p>{workflowState(run).next}</p>}{run?.data.agent_scheduler&&<AgentScheduler value={run.data.agent_scheduler}/>}<AgentActivity nativeMessages={executing?run?.data.native_messages:undefined} events={traceTurns.at(-1)??[]} active={executing} waiting={nativeQuestions.length>0} mode={run?.mode??mode} model={run?.model??model} todos={nativeTodos} manifest={run?.data.run_manifest} evidence={savedTurns.at(-1)?.result?.evidence??run?.data.run_manifest?.tools??[]}/>{desktopAvailable&&runId&&<PipelineTrace taskId={runId}/>}</div></details>}

  {right&&viewportReady&&<button className="inspector-backdrop" aria-label="Close inspector panel" onClick={()=>setRight(false)}/>}
  {right&&<aside id="workspace-inspector" className="inspector"><PanelResize side="right" width={panelWidths.right} onChange={value=>resizePanel('right',value)}/><div className="inspector-tabs">{(desktopLayout?(['assistant','preview','activity'] as const):(['preview','activity','exports','tools'] as const)).map(t=><button type="button" key={t} className={cn(tab===t&&'active')} onClick={()=>setTab(t)}>{t==='assistant'?'Assistant':t==='preview'?(desktopLayout?'Properties':'Context'):t==='activity'?'Activity':t==='exports'?<Download size={15} aria-label="Exports"/>:<Unplug size={15} aria-label="MCP tools"/>}</button>)}{desktopLayout&&<DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><button type="button" className="studio-panel-options" aria-label="More workspace panels"><Ellipsis size={15}/></button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="action-menu" side="bottom" align="end"><DropdownMenuPrimitive.Item onSelect={()=>setTab('exports')}><Download size={14}/>Exports</DropdownMenuPrimitive.Item><DropdownMenuPrimitive.Item onSelect={()=>setTab('tools')}><Unplug size={14}/>MCP tools</DropdownMenuPrimitive.Item></DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root>}<button type="button" className="studio-inspector-close" aria-label="Collapse assistant panel" onClick={()=>setRight(false)}><PanelRightClose size={16}/></button></div>
   {desktopLayout&&showDesktopAssistant&&<div className="studio-assistant-panel" hidden={tab!=='assistant'}>{conversationPanel}</div>}
   {tab!=='assistant'&&<>
   {desktopLayout&&activeDrawing&&tab==='preview'?<StudioProperties key={activeDrawing.fingerprint+':'+selectedDesignElement} drawing={activeDrawing} selected={selectedDesignElement} onSelect={setSelectedDesignElement} onRequest={askFromCanvas} onReview={()=>focusReview('[aria-label="Validated design preview"]')}/>:<>
   {plannedCandidate&&tab==='preview'?<div className="inspector-body"><div className="section-caption">{separateNativeFollowup?'SAVED DESIGN REFERENCE':'SHARED DESIGN GEOMETRY'} <button className="icon-button" aria-label="Expand design preview" onClick={event=>openCanvas(event.currentTarget)}><Expand size={16}/></button></div>{desktopLayout?<div className="studio-property-grid"><div><small>Plan version</small><strong>v{plannedCandidate.graph.version}</strong></div><div><small>Footprint · mm</small><strong>{plannedCandidate.graph.site.widthMm.toLocaleString()} × {plannedCandidate.graph.site.depthMm.toLocaleString()}</strong></div><div><small>Rooms</small><strong>{plannedCandidate.graph.rooms.length}</strong></div><div><small>Wall height · mm</small><strong>{plannedCandidate.graph.wallHeightMm??'Unavailable'}</strong></div><div className="studio-property-identity"><small>Design identity</small><code>{plannedCandidate.fingerprint}</code></div><Button variant="secondary" onClick={()=>focusReview('[aria-label="Validated design preview"]')}>Review exact design<ArrowUpRight size={14}/></Button></div>:<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} key={plannedCandidate.fingerprint} drawing={candidateDrawing(plannedCandidate)} label="Inspector design" onAsk={askFromCanvas} highlights={designHighlights} onSelectElement={setSelectedDesignElement} source={selectedSource?.image?{id:selectedSource.id,sha256:selectedSource.sha256,name:selectedSource.name,image:selectedSource.image,page:selectedSource.page}:undefined} reference={queueData?.design?.reference}/>}<p>{separateNativeFollowup?'Saved design reference. It does not include this separate native proposal or later native room-name changes.':'Proposed layout · same version in 2D and 3D. Native placement and approval are separate.'}</p></div>:<>
   {tab==='preview'&&offlineFixture&&!desktopPreview?<div className="inspector-body"><div className="section-caption">OFFLINE BRIEF CHECK <ShieldCheck size={14}/></div><div className="model-card"><strong>Exact fixture geometry</strong><p>9144 × 12192 mm footprint · 8 room requirements.</p><p>{run?'The source V3 brief validators completed.':'Run the offline check to validate the packaged local backend.'}</p><p>No AI inference, design preview or Revit operation is available in this runtime.</p></div></div>:tab==='preview'?<div className="inspector-body"><div className="section-caption">CURRENT MODEL <Box size={14}/></div><div className="model-card"><div className="model-icon"><Layers3 size={23}/></div><strong>{contextTitle}</strong><p>{contextView}</p>{!selectedDevice?.online&&<button onClick={event=>{dialogTrigger.current=event.currentTarget;setDeviceDialog(true);}}>Connect a device <ArrowUpRight size={13}/></button>}</div><div className="section-caption">DESIGN CANVAS <button className="icon-button" aria-label="Expand design preview" disabled={!previewSvg} onClick={event=>openCanvas(event.currentTarget)}><Expand size={16}/></button></div>{previewSvg?<>{run?.data.agent_design&&!drawingCurrent&&<p role="status">Older alternative preview · current drawing unavailable</p>}<div className="plan-image"><img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(previewSvg??'')}/></div><div className="element-counts">{Object.entries(previewCounts).map(([name,count])=><div key={name}><strong>{count}</strong><span>{count===1?name.replace(/s$/,''):name}</span></div>)}</div><div className="room-list">{previewRooms.map(room=><div key={room.name}><span>{room.name}</span><span>{room.expectedAreaM2.toFixed(1)} m²</span></div>)}</div></>:<div className="empty-canvas"><div className="floor-glyph"><i/><i/><i/></div><p>A place for your next idea</p><small>Your proposed plan will appear here.</small></div>}<div className="inspector-tip"><ShieldCheck size={16}/><p>You stay in control.<br/><span>Inspect, preview, approve. Then build.</span></p></div></div>:

    tab==='activity'&&desktopLayout?<div className="inspector-body studio-activity-inspector"><div className="studio-page-heading"><div><h2>{run?.title??'Task activity'}</h2><p>One task. Actual runtime steps and recorded outcomes.</p></div><ContextUsage usage={currentActivity?.usage} busy={executing}/></div>{currentActivity?.events.length?<ActivitySummary events={currentActivity.events}/>:<div className="studio-empty studio-activity-empty"><p>No runtime events were recorded for this turn.</p></div>}{run?.data.agent_scheduler&&<AgentScheduler value={run.data.agent_scheduler}/>}<details className="studio-activity-details"><summary><Workflow size={15}/>View pipeline details<ChevronDown size={14}/></summary><div>{desktopAvailable&&runId&&<PipelineTrace taskId={runId}/>}{run?.data.agent_memory&&<AgentMemory memory={run.data.agent_memory} metrics={run.data.agent_context} runId={run.id}/>}<AgentActivity nativeMessages={executing?currentActivity?.nativeMessages:undefined} events={currentActivity?.events??[]} active={executing} waiting={currentActivity?.waiting??false} mode={run?.mode??mode} model={run?.model??model} todos={currentActivity?.todos??[]} manifest={currentActivity?.manifest} evidence={currentActivity?.evidence??[]} showFeed={false}/><div className="section-caption">RUN TIMELINE <span>{currentActivity?.events.length??0} events</span></div>{currentActivity?.events.length?<ol className="timeline">{currentActivity.events.map((e,i)=><li key={e.eventId??e.index}><span className={cn('timeline-dot',i===currentActivity.events.length-1&&executing&&'live')}/><strong>{e.stage==='paused_limit'?'Analysis checkpoint':e.stage.replaceAll('_',' ')}</strong><p>{eventDetail(e)}</p><small>{e.at?new Date(e.at).toLocaleTimeString():''}</small></li>)}</ol>:<div className="inspector-empty"><Workflow size={26}/><p>No additional timeline details were recorded.</p></div>}</div></details></div>:
    tab==='activity'?<div className="inspector-body">{desktopAvailable&&runId&&<PipelineTrace taskId={runId}/>}{run?.data.agent_memory&&<AgentMemory memory={run.data.agent_memory} metrics={run.data.agent_context} runId={run.id}/>} <AgentActivity nativeMessages={executing?run?.data.native_messages:undefined} events={traceTurns.at(-1)??[]} active={executing} waiting={nativeQuestions.length>0} mode={run?.mode??mode} model={run?.model??model} todos={nativeTodos} manifest={run?.data.run_manifest} evidence={savedTurns.at(-1)?.result?.evidence??run?.data.run_manifest?.tools??[]}/><div className="section-caption">RUN TIMELINE <span>{events.length} events</span></div>{events.length?<ol className="timeline">{events.map((e,i)=><li key={e.index??i}><span className={cn('timeline-dot',i===events.length-1&&busy&&'live')}/><strong>{e.stage==='paused_limit'?'Analysis checkpoint':e.stage.replaceAll('_',' ')}</strong><p>{eventDetail(e)}</p><small>{e.at?new Date(e.at).toLocaleTimeString():''}</small></li>)}</ol>:<div className="inspector-empty"><Workflow size={26}/><p>The process, made visible.</p><small>Tool calls and verified outcomes appear here as DATUMM works.</small></div>}</div>:

    tab==='exports'?<div className="inspector-body"><div className="section-caption">RUN ARTIFACTS <Download size={14}/></div>{run?<div className="exports">{exportItems.map(a=><a key={a.ext} href={`/api/service/runs/${run.id}/export/${a.ext}`} download><a.icon size={20}/><span>{a.name}<small>{a.detail}</small></span><Download size={14}/></a>)}</div>:<div className="inspector-empty"><FolderOpen size={26}/><p>Good work deserves a record.</p><small>Run a task to export its plan, room schedule and verification record.</small></div>}</div>:

    <div className="inspector-body"><div className="section-caption">MCP TOOLS <Unplug size={14}/><span>{mcpToolsError?'Unavailable':`${mcpTools.length} available`}</span></div><Button variant="ghost" size="sm" aria-label="Refresh MCP tools" onClick={()=>void refresh()}><RotateCcw size={14}/> Refresh tools</Button>{mcpToolsError?<p className="error-banner" role="alert">Could not load MCP tools: {mcpToolsError}</p>:mcpTools.length?mcpTools.map(tool=>{const properties=Object.entries(tool.inputSchema?.properties??{}),required=new Set(tool.inputSchema?.required??[]);return <details key={tool.name} className="mcp-tool"><summary><strong>{tool.name}</strong><ChevronDown size={14} aria-hidden="true"/></summary><p>{tool.description??'No description was provided by the bridge.'}</p>{properties.length?<table><thead><tr><th>Parameter</th><th>Type</th><th>Use</th></tr></thead><tbody>{properties.map(([name,schema])=><tr key={name}><td>{name}{required.has(name)&&<small>required</small>}</td><td>{schema.type??'any'}</td><td>{schema.description??'—'}{schema.enum?<small>Allowed: {schema.enum.map(String).join(', ')}</small>:null}{schema.default!==undefined?<small>Default: {String(schema.default)}</small>:null}</td></tr>)}</tbody></table>:<p><small>No input parameters.</small></p>}</details>;}) :<div className="inspector-empty"><Unplug size={26}/><p>{workspaceReady?'No MCP tools discovered.':'Loading MCP tools…'}</p><small>Connect a model in Settings and check the installed DATUMM MCP bridge, then refresh tools.</small></div>}</div>}

   </>}
   </>}
   {!desktopLayout&&<ContextUsage usage={run?.data.usage} busy={busy}/>}
   </>}
   <div className="inspector-foot"><span>DATUMM</span><span>DESIGN WITH INTENT</span></div>

  </aside>}

  <Dialog open={deviceDialog} onOpenChange={setDeviceDialog}><DialogContent className="device-dialog" onCloseAutoFocus={restoreDialogFocus}><DialogHeader><DialogTitle>Connect your workspace</DialogTitle><DialogDescription>Authorize your Windows connector with this account. Choose how DATUMM approves plans for your Revit project.</DialogDescription></DialogHeader><div className="device-list">{devices.map(device=><div key={device.id}><Monitor size={22}/><span><strong>{device.name}</strong><small>{!device.online?'Offline':device.id===deviceId&&revitSessions===1?'Revit ready':device.id===deviceId&&revitSessions===0?'Connector online · Enable Revit bridge':'Connector online'} · {device.fullControl?'Scoped grant saved':'Approve in chat'}</small></span><Button size="sm" variant="secondary" onClick={()=>{setDeviceId(device.id);setDeviceDialog(false);}} disabled={!device.online}>{deviceId===device.id?'Selected':'Use device'}</Button><button className="icon-button" aria-label={`Disconnect ${device.name}`} onClick={()=>revoke(device.id)}><Unplug size={17}/></button></div>)}</div>{selectedDevice&&<div className="control-box"><div><ShieldCheck size={18}/><strong>Approval mode</strong></div><p>{selectedDevice.fullControl?'A Full Control grant is saved for its original Revit session and project. If you changed projects or restarted Revit, turn it off and enable it again for the current project.':'Approve every exact plan in the chat before DATUMM changes your model.'}</p><Button variant={selectedDevice.fullControl?'secondary':'default'} disabled={actionBusy||(!selectedDevice.fullControl&&revitSessions!==1)} onClick={()=>setControl(selectedDevice)}>{selectedDevice.fullControl?'Turn off Full Control':'Enable Full Control'}</Button><small>Full Control applies only to validated 3BHK builds in the granted project and session. It expires after one hour or ten builds, whichever comes first. Revit still validates the exact proposal. Disconnect or turn it off anytime.</small></div>}<div className="pairing-box"><strong>Connect from Revit</strong><p>In Revit, open Add-Ins / DATUMM Agent / Connection Settings. Choose Sign in with browser, then authorize your computer. No pairing code is needed.</p><a className="installer-download" href={installerRelease.file}><Download size={17}/><span>Download public Revit add-in<small>Windows x64 · Revit 2026 · public candidate {installerRelease.version} · unsigned development build</small></span></a><a className="checksum-link" href={installerRelease.checksumUrl}>SHA-256 checksum</a></div><p className="settings-note"><ShieldCheck size={15}/> Revoking removes this device access. Authorize it again from Revit to reconnect.</p>{error&&<p className="error-banner" role="alert">{error}</p>}{!connected&&<p className="error-banner">Sign in before authorizing a device.</p>}</DialogContent></Dialog>

  <Dialog open={Boolean(deleteTarget)} onOpenChange={open=>{if(!open)setDeleteTarget(null);}}><DialogContent onCloseAutoFocus={restoreDialogFocus}><DialogHeader><DialogTitle>Delete this chat?</DialogTitle><DialogDescription>“{deleteTarget?.title}” will be removed from your chat history. Its local context, agent history and app-managed files will be permanently removed. Built Revit elements and external exports remain. Cleanup failures stay pending and can be retried.</DialogDescription></DialogHeader>{error&&<p role="alert" className="error-banner">{error}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={()=>setDeleteTarget(null)}>Keep chat</Button><Button className="delete-button" disabled={actionBusy} onClick={()=>void removeTask()}>Delete chat</Button></div></DialogContent></Dialog>
  <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}><DialogContent onCloseAutoFocus={restoreDialogFocus}><DialogHeader><DialogTitle>Delete all chats?</DialogTitle><DialogDescription>This removes all recent, pinned and archived chats from this account's history. It does not delete Revit elements. Finish or cancel running tasks first. Local context and agent history are permanently removed. Built Revit elements and external exports remain. Cleanup failures stay pending.</DialogDescription></DialogHeader><label className="delete-confirm-label">Type DELETE to confirm<input value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} autoComplete="off"/></label>{error&&<p role="alert" className="error-banner">{error}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={()=>setDeleteAllOpen(false)}>Cancel</Button><Button className="delete-button" disabled={actionBusy||deletePhrase!=='DELETE'} onClick={()=>void removeAllTasks()}>Delete all chats</Button></div></DialogContent></Dialog>
   <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}><DialogContent className="canvas-dialog" onCloseAutoFocus={event=>{event.preventDefault();if(canvasTrigger.current?.isConnected)canvasTrigger.current.focus();}}><DialogHeader><DialogTitle>{plannedCandidate&&separateNativeFollowup?'Saved design reference':'Design preview'}</DialogTitle><DialogDescription>{plannedCandidate&&separateNativeFollowup?'Saved geometry excludes the separate native proposal and later native room-name changes.':'Proposed geometry · select a room to inspect dimensions'}</DialogDescription></DialogHeader>{plannedCandidate?<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} drawing={candidateDrawing(plannedCandidate)} label="Expanded design" onAsk={askFromCanvas}/>:designVersion?<PlanCanvas canvasInputEnabled={canvasInputEnabled} persistentProperties={persistentProperties} drawing={designVersion} onAsk={askFromCanvas}/>:previewSvg?<div className="canvas-scroll"><img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(previewSvg)}/></div>:<p>No current design preview.</p>}</DialogContent></Dialog>
    {desktopLayout&&<footer className="studio-global-footer"><span><span className={cn('connection-dot',connected&&'online')}/>{offlineFixture?'Offline preview · sample workspace':desktopPreview&&liveRuntime?'Live preview · Ask / Plan connected':currentProject?.title??'Design workspace'}</span><span>{offlineFixture?'Sample data · no live Revit writes':desktopPreview&&liveRuntime?'Live preview · no Revit writes':selectedDevice?.online&&revitSessions===1?'Connected workspace · changes require approval':'Hosted workspace · exact Revit approval required'}</span><span>{activeDrawing?.graph.rooms.find(room=>room.key===selectedDesignElement)?.name||(selectedDesignElement?'Selected element':'Architectural workspace')}{activeDrawing?` · v${activeDrawing.version}`:''}</span></footer>}
    <DesktopSettings open={settingsOpen} onOpenChange={changeSettingsOpen} authConfigured={authConfigured} models={models} generalContent={generalSettingsContent} revitContent={<><p>Connect the separately installed DATUMM Revit add-in to this account. Keep Revit and its connector running on your Windows computer.</p><div className="device-list">{devices.map(device=><div key={device.id}><Monitor size={18}/><span><strong>{device.name}</strong><small>{device.online?'Connector online':'Offline'}</small></span><Button variant="ghost" disabled={!device.online} onClick={()=>setDeviceId(device.id)}>{deviceId===device.id?'Selected':'Use device'}</Button></div>)}</div><Button variant="secondary" onClick={()=>setDeviceDialog(true)}>Manage Revit connections</Button><p className="settings-note">Review the exact proposal in chat before approving model changes.</p></>}/><ProjectContext open={projectContextOpen} onOpenChange={setProjectContextOpen}/>
    </div>
    <Dialog open={localConnections} onOpenChange={setLocalConnections}><DialogContent><DialogHeader><DialogTitle>Local Revit MCP</DialogTitle><DialogDescription>The installed DATUMM plugin is discovered locally. Ask/Plan can inspect it without cloud connector pairing.</DialogDescription></DialogHeader>{devices.length?devices.map(device=><div className="device-list" key={device.id}><Monitor size={18}/><strong>{device.name}</strong><Button variant="secondary" onClick={()=>{setDeviceId(device.id);setLocalConnections(false);}}>{deviceId===device.id?'Selected':'Use session'}</Button></div>):<p>No Revit session was discovered. Open Revit 2026, enable the DATUMM bridge, and refresh.</p>}<Button variant="secondary" onClick={()=>void refresh()}>Refresh sessions</Button><p>Read tools inspect the model; design and native proposal tools prepare reviewable geometry. Exact design acceptance and native execution use the trusted desktop controls.</p></DialogContent></Dialog></>;

}
