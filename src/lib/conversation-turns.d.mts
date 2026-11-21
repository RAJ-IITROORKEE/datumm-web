export type ConversationRecord = {prompt?:string;answer?:string;turnId?:string;presentation?:unknown;completion?:unknown;projectCitations?:unknown;recordedOutcome?:{schemaVersion:1;taskId:string;turnId:string;executionId:string;status:'needs_connection'};attachmentIds?:string[];nativeMessages?:{id:string;text:string;finish:string|null}[]};
export type ConversationTurn = ConversationRecord & {index:number;endIndex:number;answerIndex?:number};
export function conversationTurns(records?:ConversationRecord[]):ConversationTurn[];
export function turnEvents<T extends {turnId?:string}>(turns:ConversationTurn[],groups:T[][],ordinal:number):T[];
export function processTurnStatus(input:{turn:ConversationTurn;turns:ConversationTurn[];taskId:string;events:{stage:string;taskId?:string;turnId?:string;executionId?:string}[];last:boolean;taskStatus:string}):string;
export function answerHasCompletionProof(input:{turn:ConversationTurn;turns:ConversationTurn[];taskId:string;events:{stage:string;detail:string;sequence?:number;taskId?:string;turnId?:string;executionId?:string}[]}):boolean;

export function historicalOutcome(turn:ConversationTurn,turns:ConversationTurn[],taskId:string,events:{stage:string;executionId?:string}[],savedError?:unknown):'needs_connection'|'rejected'|null;

export function rejectedHistoricalStatus(turn:ConversationTurn,turns:ConversationTurn[],taskId:string,events:{stage:string;executionId?:string}[]):string;

export function legacyAnswerOutputState(input:{last:boolean;executing:boolean;taskStatus:string;historicalStatus:string}):'streaming'|'saved'|'partial';

export function answerCompletionCandidate(input:{turn:ConversationTurn;turns:ConversationTurn[];taskId:string;events:{stage:string;sequence?:number;taskId?:string;turnId?:string;executionId?:string}[]}):boolean;
export function verifyAnswerCompletionHash(completion:unknown,text:string,digest?:SubtleCrypto):Promise<boolean>;
