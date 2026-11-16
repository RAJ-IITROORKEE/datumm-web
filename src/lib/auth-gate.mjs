/** Missing configuration is unavailable; only a loaded, signed-in visitor reaches the workspace. */
export function authGateState(authConfigured,isLoaded,userId){
  if(!authConfigured)return 'unavailable';
  if(!isLoaded)return 'loading';
  return userId?'open':'signed-out';
}
