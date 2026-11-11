type NativeStage = {state?:string;operationId?:string;proposal?:{proposalId?:string};outcomeReceipt?:{status?:string};feedback?:{verified?:boolean}};
export function studioPipeline({planReady,accepted,build,executing,mode}:{planReady:boolean;accepted:boolean;build?:NativeStage|null;executing:boolean;mode?:string}) {
 const prepared=Boolean(build?.proposal?.proposalId);
 const approved=Boolean(build?.operationId&&['applying','committed','failed','rolled_back'].includes(build.state??''));
 const applied=Boolean(build?.operationId&&build.state==='committed'&&build.outcomeReceipt?.status!=='unknown');
 const verified=applied&&(build?.outcomeReceipt?build.outcomeReceipt.status==='verified':build?.feedback?.verified===true);
 const uncertain=Boolean(build?.operationId&&(['unknown','failed','rolled_back'].includes(build.state??'')||build.outcomeReceipt?.status==='unknown'));
 const steps=[
  {label:'Brief',state:planReady?'done':!prepared?'current':'pending'},
  {label:'Plan',state:planReady?'done':executing&&!prepared?'current':'pending'},
  {label:'Review',state:accepted?'done':planReady&&!prepared?'current':'pending'},
  {label:'Prepare',state:prepared?'done':accepted?'current':'pending'},
  {label:'Approve',state:approved?'done':prepared&&!uncertain&&!applied?'current':'pending'},
  {label:'Apply',state:applied?'done':uncertain?'attention':approved?'current':'pending'},
  {label:'Verify',state:verified?'done':applied?'attention':'pending'},
 ];
 // Ask chats and chats without a plan have no build to prepare, approve, apply or verify.
 if(mode==='ask')return steps.slice(0,2);
 return planReady?steps:steps.slice(0,2);
}
