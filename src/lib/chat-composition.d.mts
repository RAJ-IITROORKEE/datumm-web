export type CompositionNode =
 | {type:'text';text:string}
 | {type:'stack'|'grid';children:CompositionNode[]}
 | {type:'details';label:string;children:CompositionNode[]}
 | {type:'table';title:string;columns:string[];rows:string[][]}
 | {type:'bars';title:string;unit:string;items:{label:string;value:number;display:string}[]}
 | {type:'flow';title:string;nodes:{id:string;label:string}[];edges:{from:string;to:string}[]}
 | EvidenceNode;
export type EvidenceNode = {type:'evidence';ref:{kind:'report-revision';revisionId:string;contentHash:string};display:{revisionNumber:number;createdAt:string;planTitle:string;planVersion:number;rowCount:number;proposedRoomCount:number;proposedAreaM2:number}};
/** `schemaVersion` 2 is the evidence-backed variant; 1 is the illustrative one. */
export type ChatComposition = {root:CompositionNode;schemaVersion:1|2};
export function validateChatComposition(value:unknown,scope:{taskId?:string;turnId?:string;text:string;state:string},digest?:SubtleCrypto):Promise<ChatComposition|null>;
