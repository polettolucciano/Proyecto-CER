import type { WorkspaceRepository } from '../persistence';
import type { Attachment,Workspace } from '../../types';
import { backendMessage,supabase } from './client';
import { workspaceCommands } from './commands';
export class SupabaseWorkspaceRepository implements WorkspaceRepository {
 readonly remote=true;
 private snapshot:Workspace|undefined;
 private pending:{fingerprint:string;operationId:string}|undefined;
 async load():Promise<Workspace>{
  const {data,error}=await supabase!.rpc('cer_workspace');
  if(error)throw new Error(backendMessage(error));
  if(!data || !Array.isArray(data.users))throw new Error('Tu cuenta todavía no tiene un perfil activo de CER. Contactá a Administración.');
  const workspace=data as Workspace;
  workspace.records=workspace.records.map(r=>({...r,photos:r.photos.map(photo=>({...photo,data:new Blob()}))}));
  this.snapshot=workspace;return workspace;
 }
 async save(next:Workspace):Promise<void>{
  if(!this.snapshot)throw new Error('Primero cargá la información del servidor.');
  const commands=workspaceCommands(this.snapshot,next);if(!commands.length)return;
  for(const command of commands)if(command.kind==='record')command.data={...(command.data as object),createdAt:undefined};
  const fingerprint=JSON.stringify(commands,(key,value)=>key==='data' && value instanceof Blob ? undefined:value);
  if(this.pending?.fingerprint!==fingerprint)this.pending={fingerprint,operationId:crypto.randomUUID()};
  for(const command of commands.filter(item=>item.kind==='record')){
   const record=command.data as Workspace['records'][number];const photos:Attachment[]=[];
   for(const photo of record.photos){
    if(photo.storagePath){photos.push(photo);continue;}
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[photo.type];
    if(!ext || photo.data.size>5242880)throw new Error('La foto no cumple el formato o tamaño permitido.');
    const path=`${record.module}/${record.userId}/${this.pending.operationId}/${photo.id}.${ext}`;
    const {error}=await supabase!.storage.from('cer-evidence').upload(path,photo.data,{contentType:photo.type,upsert:false});
    if(error && error.message!=='The resource already exists')throw new Error('No se pudo subir la evidencia. Conservá el formulario.');
    photos.push({...photo,storagePath:path});
   }
   command.data={...record,createdAt:undefined,photos};
  }
  const {error}=await supabase!.rpc('cer_apply_changes',{p_operation_id:this.pending.operationId,p_expected_revision:this.snapshot.serverRevision,p_commands:commands});
  if(error)throw new Error(backendMessage(error));
  this.pending=undefined;
  this.snapshot={...next,serverRevision:(this.snapshot.serverRevision??0)+1};
 }
}
