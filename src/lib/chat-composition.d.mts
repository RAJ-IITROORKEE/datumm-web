export type CompositionNode =
 | {type:'text';text:string}
 | {type:'stack'|'grid';children:CompositionNode[]}
 | {type:'details';label:string;children:CompositionNode[]}
 | {type:'table';title:string;columns:string[];rows:string[][]}
 | {type:'bars';title:string;unit:string;items:{label:string;value:number;display:string}[]}
 | {type:'flow';title:string;nodes:{id:string;label:string}[];edges:{from:string;to:string}[]};
export type ChatComposition = {root:CompositionNode};
export function validateChatComposition(value:unknown,scope:{taskId?:string;turnId?:string;text:string;state:string},digest?:SubtleCrypto):Promise<ChatComposition|null>;
