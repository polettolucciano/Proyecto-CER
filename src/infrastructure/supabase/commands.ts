import type { Workspace } from '../../types';
export interface WorkspaceCommand {kind:'equipment'|'task'|'profile'|'training'|'settings'|'record'|'void';data:unknown;duplicateApproved?:boolean;}
const changed=(a:unknown,b:unknown)=>JSON.stringify(a)!==JSON.stringify(b);
export function workspaceCommands(before:Workspace,after:Workspace):WorkspaceCommand[] {
 const commands:WorkspaceCommand[]=[];
 const records=after.records.filter(r=>!before.records.some(old=>old.id===r.id));
 const advanced=new Set(records.filter(r=>!r.supersedesId).map(r=>r.taskId));
 for(const [key,kind] of [['equipment','equipment'],['tasks','task'],['users','profile'],['training','training']] as const){
  if(before[key].some(old=>!after[key].some(item=>item.id===old.id)))throw new Error('No se permite eliminar entidades desde este formulario.');
  for(const item of after[key])if(changed(before[key].find(row=>row.id===item.id),item) && !(key==='tasks' && advanced.has(item.id)))commands.push({kind,data:item});
 }
 if(changed(before.settings,after.settings))commands.push({kind:'settings',data:after.settings});
 for(const r of records)commands.push({kind:'record',data:r,duplicateApproved:r.duplicateApproved===true});
 for(const r of after.records){const old=before.records.find(item=>item.id===r.id);
  if(old && old.status==='active' && r.status==='voided')commands.push({kind:'void',data:{id:r.id,voidReason:r.voidReason}});
  else if(old && changed(old,r) && !records.some(item=>item.supersedesId===old.id))throw new Error('Los controles guardados requieren una rectificación.');
 }
 if(before.records.some(old=>!after.records.some(item=>item.id===old.id)))throw new Error('No se permite eliminar controles.');
 return commands;
}
