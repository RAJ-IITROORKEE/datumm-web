const prefix='datumm-selection-uncertain:';
const keyFor=(account,task,brief)=>prefix+JSON.stringify([account,task,brief]);
const validText=value=>typeof value==='string'&&value.length>0&&value.length<=512;
const validPlan=value=>value&&validText(value.planId)&&Number.isSafeInteger(value.version)&&value.version>0&&validText(value.fingerprint);

export function readSelectionMarker(storage,account,task,brief){
 try{
  if(!storage||![account,task,brief].every(validText))return {status:'unavailable'};
  const raw=storage.getItem(keyFor(account,task,brief));if(raw===null)return {status:'ready',plan:null};
  const marker=JSON.parse(raw);
  if(marker?.schemaVersion!==1||marker.account!==account||marker.task!==task||marker.brief!==brief||!validPlan(marker.plan))return {status:'invalid'};
  return {status:'ready',plan:{planId:marker.plan.planId,version:marker.plan.version,fingerprint:marker.plan.fingerprint}};
 }catch{return {status:'unavailable'};}
}
export function writeSelectionMarker(storage,account,task,brief,plan){
 if(!validPlan(plan)||![account,task,brief].every(validText))return false;
 try{
  const key=keyFor(account,task,brief),raw=JSON.stringify({schemaVersion:1,account,task,brief,plan:{planId:plan.planId,version:plan.version,fingerprint:plan.fingerprint}});
  if(storage.getItem(key)!==null)return false;
  storage.setItem(key,raw);return storage.getItem(key)===raw;
 }catch{return false;}
}
export function clearSelectionMarker(storage,account,task,brief,expected){
 try{const marker=readSelectionMarker(storage,account,task,brief);if(marker.status!=='ready'||!validPlan(expected))return false;if(!marker.plan)return true;if(marker.plan.planId!==expected.planId||marker.plan.version!==expected.version||marker.plan.fingerprint!==expected.fingerprint)return false;const key=keyFor(account,task,brief);storage.removeItem(key);return storage.getItem(key)===null;}catch{return false;}
}
async function underSelectionLock(locks,account,task,brief,operation){
 if(!locks||typeof locks.request!=='function'||![account,task,brief].every(validText))return false;
 try{return await locks.request(keyFor(account,task,brief),{mode:'exclusive'},operation);}catch{return false;}
}
export const claimSelectionMarker=(storage,locks,account,task,brief,plan)=>underSelectionLock(locks,account,task,brief,()=>writeSelectionMarker(storage,account,task,brief,plan));
export const releaseSelectionMarker=(storage,locks,account,task,brief,plan,stillCurrent=()=>true)=>underSelectionLock(locks,account,task,brief,()=>stillCurrent()&&clearSelectionMarker(storage,account,task,brief,plan));
