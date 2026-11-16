export function conversationResult(input:{mode?:string;status?:string;hasConcept:boolean;loading?:boolean;current?:boolean}):{label:string;note:string|null;prompts:string[]|null}|null;
export function failedTurnRecovery(input:{status?:string;answer?:string;current:boolean;recoveryAction?:string;hasConcept?:boolean}):{message:string;hasConcept:boolean}|null;
export function nativeBatchProgress(run?:{mode?:string;status?:string;data?:{agent_result?:{status?:string;batchHistory?:{operationId:string;state:string;nativeStatus:string}[]}}}|null):number;
