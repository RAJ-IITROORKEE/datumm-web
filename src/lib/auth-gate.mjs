/** Decides what the web entry renders: only a signed-in (or unconfigured-auth) visitor reaches the workspace. */
export function authGateState(authConfigured,isLoaded,userId){
  if(!authConfigured)return 'open';
  if(!isLoaded)return 'loading';
  return userId?'open':'signed-out';
}
