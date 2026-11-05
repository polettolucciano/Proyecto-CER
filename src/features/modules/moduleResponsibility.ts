import { allowed } from '../../domain';
import { moduleById } from '../../data';
import type { ModuleId, Workspace } from '../../types';
export function defaultResponsible(data: Workspace, module: ModuleId, equipmentId?: string): string {
  const equipment = data.equipment.find(item => item.id === equipmentId);
  const candidate = equipment?.responsibleId || moduleById(module, data.modules).responsibleId;
  return candidate && data.users.some(user => user.id === candidate && allowed(user, module)) ? candidate : '';
}
export function responsibleName(data: Workspace, userId?: string) { return data.users.find(user => user.id === userId)?.name ?? 'Sin responsable asignado'; }
