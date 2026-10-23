type Task={status:string;mode:string;data:Record<string,any>;modelOutcome?:{state:string;verified:boolean}};
export function placementIssue(input:{pending:boolean;preparing?:boolean;sessionAvailable:boolean;contextAvailable:boolean;viewAvailable:boolean;requirements:string[];staleBinding:boolean;x:string;y:string;rotation:string}){
 if(input.preparing)return 'Checking the exact proposal in Revit. No permanent build is being applied.';
 if(input.pending)return 'Finish this chat’s active work or answer its pending question.';
 if(!input.sessionAvailable)return 'Choose a connected Revit session.';
 if(!input.contextAvailable)return 'Inspect placement and loaded types.';
 if(!input.viewAvailable)return 'Choose a measured plan view and level.';
 if(input.staleBinding)return 'Loaded choices belong to another session/document. Review the current loaded types again.';
 if(input.requirements.length)return 'The plan uses sizes that are not loaded in Revit. Revise it to the selected loaded types above, then accept the revised plan.';
 for(const [label,text,limit] of [['Origin X',input.x,900000],['Origin Y',input.y,900000]] as const)
  if(!text.trim()||!Number.isFinite(Number(text))||Math.abs(Number(text))>limit)return `${label} must be a number between −${limit} and ${limit} mm.`;
 if(!input.rotation.trim()||!Number.isFinite(Number(input.rotation))||Number(input.rotation)<0||Number(input.rotation)>=360)return 'Rotation must be a number from 0 up to 360 degrees (excluding 360).';
 return null;
}
// @lat: [[architecture#Hosted workspace#Review and authority]]
export function workflowState(task:Task){
 const d=task.data,build=d.native_build,design=d.design;
 if(build?.operationId&&['failed','rolled_back'].includes(build.state))return {kind:'needs_input',label:'Revit build failed',next:`${build.readback?.receipt?.error??'Native transaction did not commit'}. Review placement and existing geometry, then prepare a corrected proposal.`};
 const receipt=build?.outcomeReceipt;
 if(receipt?.status==='stale')return {kind:'needs_input',label:'Revit evidence is stale',next:'Return to the original document and inspect the original operation. The saved evidence does not verify the current model.'};
 if(receipt?.status==='partial')return {kind:'needs_input',label:'Revit verification is partial',next:'Some operations passed independent read-back. Review the remaining findings before preparing another change.'};
 if(receipt?.status==='committed')return {kind:'needs_input',label:'Committed · verification incomplete',next:'The native commit is recorded. Inspect the original operation to complete independent verification.'};
 if(receipt?.status==='unknown')return {kind:'needs_input',label:'Check original Revit operation',next:'The saved receipt cannot establish the result. Inspect the original operation before another build.'};
 if(build?.operationId&&!build.feedback?.verified||!build&&task.modelOutcome?.state==='unknown')return {kind:'needs_input',label:'Check original Revit operation',next:'Inspect its original receipt before another build.'};
 if(d.opencode_questions?.length||d.agent_question)return {kind:'needs_input',label:'Waiting for your input',next:'Answer required questions to continue the same turn.'};
 if(d.native_build_error&&!build?.operationId)return {kind:'needs_input',label:'Revit build blocked',next:d.native_build_error};
 if(['queued','running'].includes(task.status))return {kind:'in_progress',label:task.status==='queued'?'Queued':d.run_manifest?.tools?.some((call:{status:string;tool:string})=>call.status==='running'&&/^(?:get_document_context|get_model_catalog|get_view_context|get_plan_snapshot|query_elements|query_quantities|query_rooms|export_view_image|operation_status|prepare_plan_build)$/.test(call.tool.replace(/^datumm_revit_/,'')))?'Waiting for Revit':'Working',next:'Follow actual tool and specialist activity below.'};
 const nativeError=[...(d.orchestration?.evidence??[])].reverse().find(call=>call.result?.structuredContent?.error?.code)?.result.structuredContent.error;
 if(nativeError&&['REVIT_BUSY','TIMEOUT'].includes(nativeError.code))return {kind:'needs_input',label:nativeError.code==='REVIT_BUSY'?'Revit is busy':'Revit read timed out',next:'Reconnect or finish the native interaction; unavailable evidence is not an empty model.'};
 if(d.failure||d.error||['failed','cancelled','interrupted','paused_limit'].includes(task.status))return {kind:'needs_input',label:'Stopped at a saved checkpoint',next:'Your conversation and completed results are saved. Review the error, then continue this chat explicitly.'};
 if(design?.reference?.stale||design?.revisionRequested)return {kind:'needs_input',label:'Design revision required',next:'Update this source or requested geometry; acceptance was cleared.'};
 if(build?.state==='preview'&&Date.parse(build.proposal?.expiresAt)<=Date.now())return {kind:'needs_input',label:'Native review expired',next:'Refresh the exact review, then approve the renewed proposal before any Revit write.'};
 if(build?.state==='preview'||task.status==='awaiting_approval')return {kind:'ready_review',label:'Exact native proposal ready',next:'Review and approve this separate proposal before any Revit write.'};
 if((receipt?receipt.status==='verified':build?.feedback?.verified)||!build&&task.modelOutcome?.verified)return {kind:'ready_review',label:'Native receipt verified',next:'Review recorded read-back and any remaining architectural checks.'};
 const planAttempt=[...(d.orchestration?.evidence??[])].reverse().find(call=>/^(design_plan|reconstruct_plan)$/.test(call.tool?.replace(/^datumm_revit_/,'')));
 if(!build&&planAttempt?.status==='failed')return {kind:'needs_input',label:'Plan generation failed',next:'No new plan was generated. Review the recorded tool error, then retry this request after correcting it.'};
 if(design?.selected)return {kind:'ready_review',label:'Design accepted',next:'Build in Revit uses the active plan view, checked placement and measured loaded types.'};
 if(design?.candidates?.length)return {kind:'ready_review',label:'Design ready for review',next:'Review dimensions, source alignment and the exact proposed graph.'};
 if(design)return {kind:'needs_input',label:'Layout needs adjustment',next:'Try a larger footprint or revise the room sizes.'};
 return {kind:'needs_input',label:'Turn settled',next:'Provide remaining requirements or review saved evidence. A finished turn does not prove a build.'};
}
