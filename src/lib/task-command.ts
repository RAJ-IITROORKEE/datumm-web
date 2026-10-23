// An interrupted native command keeps its original identity for reconciliation.
// Only a read can be issued again after its terminal interrupted receipt.
export function replaceTerminalCommand(type:unknown,state:string):boolean{
 return state==='applied'||state==='rejected'||
  (state==='interrupted'&&(type==='compare_result'||type==='inspect_result'));
}
