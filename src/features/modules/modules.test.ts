import { describe,it,expect } from 'vitest';
import { createSeed,createGeneralModule,workspaceModules } from '../../data';
import { canPlan,visibleData } from '../../domain';
import { normalizeWorkspace } from '../../workspace';
import { defaultResponsible } from './moduleResponsibility';
import { createMaintenanceRecord,registerRecordInWorkspace } from '../records/application/registerRecord';
import { calendarControls } from '../planning/calendarEvents';
const id='custom-00000000-0000-4000-8000-000000000004' as const;
describe('módulos y responsables configurables',()=>{
 it('agrega módulos sin perder formularios anteriores y conserva permisos al recargar',()=>{
  const data=createSeed();data.modules=[createGeneralModule(id,'Climatización')];
  data.users.find(user=>user.role==='Enfermería')!.modules.push(id);
  const restored=normalizeWorkspace(data)!;
  expect(workspaceModules(restored)).toHaveLength(9);
  expect(workspaceModules(restored).find(module=>module.id==='generator')?.sections[0].fields[0].id).toBe('radiator');
  expect(restored.users.find(user=>user.role==='Enfermería')?.modules).toContain(id);
 });
 it('propone el responsable de equipo sobre el del módulo y no habilita cuentas sin acceso',()=>{
  const data=createSeed();const admin=data.users.find(user=>user.role==='Administrador')!;
  const operator={...admin,id:'operator',name:'María Técnica',role:'Operador' as const,modules:[id]};data.users.push(operator);
  data.modules=[{...createGeneralModule(id,'Climatización'),responsibleId:admin.id}];
  data.equipment.push({...data.equipment[0],id:'climate',module:id,responsibleId:operator.id});
  expect(defaultResponsible(data,id,'climate')).toBe(operator.id);expect(canPlan(operator)).toBe(false);
  expect(visibleData(data,operator).equipment.map(item=>item.id)).toEqual(['climate']);
  operator.active=false;expect(defaultResponsible(data,id,'climate')).toBe('');
 });
 it('guarda una copia del formulario y permite encontrar controles realizados en calendario',()=>{
  const data=createSeed();data.records=[];data.modules=[createGeneralModule(id,'Climatización')];
  const record=createMaintenanceRecord({module:id,equipmentId:data.equipment[0].id,date:'2026-11-05',userId:data.users[0].id,hasIssue:false,values:{work:'Mantenimiento general'},notes:'',photos:[]});
  const next=registerRecordInWorkspace(data,record);next.modules=[{...next.modules![0],name:'Nombre posterior'}];
  expect(next.records[0].formDefinition?.name).toBe('Climatización');
  const events=calendarControls(next,[],'2026-11-01','2026-11-30');expect(events).toHaveLength(1);expect(events[0].record?.id).toBe(record.id);
  expect(calendarControls(next,[],'2026-11-01','2026-11-30',false)).toHaveLength(0);
 });
});
