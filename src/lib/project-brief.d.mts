import type { Run, ProjectRow } from '../components/workspace/use-workspace-state';
export type BriefSection =
 | {kind:'interpretation'; values:{label:string;value:string;provenance:string;sourceText:string}[]; sourceOnly:{label:string;value:string;provenance:string;sourceText:string}[]; assumptions:string[]; unresolved:string[]; deferred:string[]; status:string}
 | {kind:'handoff'; goal:string;nextAction:string;operations:string[];version:string;schemaVersion:string;documentId:string;revision:string}
 | {kind:'accepted'; assumptions:string[];planId:string;version:string;fingerprint:string;relation:'current'|'different'|'unknown'};
export type BriefProjection = {state:'no-task'|'project-mismatch';sections:BriefSection[]} | {state:'ready';taskId:string;taskTitle:string;projectId:string;projectTitle:string;association:'matched'|'unavailable'|'unknown';taskVersion:string;eventCursor:string;sections:BriefSection[]};
export function projectBrief(run:Run|null, selectedTaskId:string|null, project:ProjectRow|null):BriefProjection;

export function briefChips(run:Run|null|undefined):string[];
export function provenanceLabel(value:string):string;
