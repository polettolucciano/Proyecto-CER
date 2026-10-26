import {describe,it,expect} from 'vitest';
import {createSeed} from '../../data';
import {workspaceCommands} from './commands';
import {createMaintenanceRecord,registerRecordInWorkspace} from '../../features/records/application/registerRecord';
describe('comandos de backend',()=>{
 it('envía solo la entidad afectada',()=>{const before=createSeed();const next={...before,equipment:before.equipment.map((item,index)=>index?item:{...item,name:'Actualizado'})};expect(workspaceCommands(before,next).map(c=>c.kind)).toEqual(['equipment']);});
 it('registro y avance no generan dos operaciones independientes',()=>{const before=createSeed(),task=before.tasks[0];const record=createMaintenanceRecord({module:task.module,equipmentId:task.equipmentId,taskId:task.id,date:'2026-10-26',userId:before.users[0].id,hasIssue:false,values:{},notes:'',photos:[]});const commands=workspaceCommands(before,registerRecordInWorkspace(before,record));expect(commands.map(c=>c.kind)).toEqual(['record']);});
 it('rechaza eliminación de históricos',()=>{const before=createSeed();expect(()=>workspaceCommands(before,{...before,records:[]})).toThrow('No se permite eliminar controles');});
});
