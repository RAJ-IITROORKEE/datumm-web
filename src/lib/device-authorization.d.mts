export type AuthorizationState={status:'invalid'|'signed-out'|'expired'|'conflict'|'unavailable'|'approved'}|{status:'ready'|'already-approved';name:string};
export type AuthorizationDependencies={fetcher?:typeof fetch;signal?:AbortSignal};
export function authorizationRequest(value:unknown):string|null;
export function authorizationReturnUrl(request:unknown):string;
export function authorizationGate(configured:boolean,loaded:boolean,userId:string|null|undefined):'unconfigured'|'loading'|'signed-in'|'signed-out';
export function reviewAuthorization(request:unknown,dependencies?:AuthorizationDependencies):Promise<AuthorizationState>;
export function approveAuthorization(request:unknown,dependencies?:AuthorizationDependencies):Promise<AuthorizationState>;
