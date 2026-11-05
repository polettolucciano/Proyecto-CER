import { describe, it, expect } from 'vitest';
import { createSeed } from '../../data';
import { occurrences } from '../../domain';
import { buildAnnualReport } from '../reports/annualReport';
import { cancelScheduledControl } from './cancelSchedule';
import { workspaceCommands } from '../../infrastructure/supabase/commands';
const fixture=()=>{const data=createSeed();data.records=[];data.tasks=[{...data.tasks[0],id:'monthly',module:'generator' as const,frequency:'Mensual' as const,due:'2026-01-31',active:true,anchorDay:31}];return data;};
describe('cancelación de controles previstos sin pérdida de historial',()=>{
 it('cancela una fecha, mantiene la repetición y conserva el fin de mes',()=>{
  const data=fixture(),admin=data.users.find(user=>user.role==='Administrador')!;
  const next=cancelScheduledControl(data,admin,'monthly','2026-01-31','date','Equipo fuera de servicio');
  expect(next.tasks[0].due).toBe('2026-02-28');
  expect(occurrences(next.tasks[0],'2026-01-01','2026-04-30')).toEqual(['2026-02-28','2026-03-31','2026-04-30']);
  expect(buildAnnualReport(next,next.tasks,2026).groups[0].rows[0].months[0].planned).toBe(0);
  expect(workspaceCommands(data,next)).toEqual([{kind:'cancel-task',data:{id:'monthly',date:'2026-01-31',scope:'date',reason:'Equipo fuera de servicio'}}]);
  expect(next.auditEvents[0].entityType).toBe('task');expect(data.tasks[0].due).toBe('2026-01-31');
 });
 it('cancela la serie desde una fecha sin borrar los meses anteriores',()=>{
  const data=fixture(),admin=data.users.find(user=>user.role==='Administrador')!;
  const next=cancelScheduledControl(data,admin,'monthly','2026-03-31','series','Servicio discontinuado por CER');
  expect(occurrences(next.tasks[0],'2026-01-01','2026-12-31')).toEqual(['2026-01-31','2026-02-28']);
  const cells=buildAnnualReport(next,next.tasks,2026).groups[0].rows[0].months;
  expect(cells[0].planned).toBe(1);expect(cells[2].planned).toBe(0);
 });
 it('no cancela registros realizados, ni fechas ajenas, ni operaciones de enfermería',()=>{
  const data=fixture(),admin=data.users.find(user=>user.role==='Administrador')!,nurse=data.users.find(user=>user.role==='Enfermería')!;
  expect(()=>cancelScheduledControl(data,nurse,'monthly','2026-01-31','date','Motivo de la cancelación')).toThrow('Solo Administración');
  expect(()=>cancelScheduledControl(data,admin,'monthly','2026-02-01','date','Motivo de la cancelación')).toThrow('no pertenece');
  const seed=createSeed().records[0];data.records=[{...seed,taskId:'monthly',date:'2026-01-31',status:'active'}];
  expect(()=>cancelScheduledControl(data,admin,'monthly','2026-01-31','date','Motivo de la cancelación')).toThrow('realizados');expect(data.records).toHaveLength(1);
 });
});
it('no inventa vencimientos anteriores al primer control de una programación nueva',()=>{
 const data=fixture();data.tasks=[{...data.tasks[0],due:'2026-11-05',startsOn:'2026-11-05',anchorDay:5}];
 const cells=buildAnnualReport(data,data.tasks,2026).groups[0].rows[0].months;
 expect(cells.slice(0,10).every(cell=>cell.planned===0 && cell.overdue===0)).toBe(true);expect(cells[10].planned).toBe(1);
});
