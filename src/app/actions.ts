import type { Equipment, MaintenanceRecord, ModuleId, Page, Task, TeamUser, Training } from '../types';

/** Comandos de interfaz disponibles para las pantallas y los diálogos. */
export interface AppActions {
  navigate: (page: Page, module?: ModuleId) => void;
  newRecord: (module?: ModuleId, task?: Task, equipmentId?: string) => void;
  viewRecord: (record: MaintenanceRecord) => void;
  editTask: (task?: Task) => void;
  viewTask: (task: Task) => void;
  editEquipment: (equipment?: Equipment) => void;
  viewEquipment: (equipment: Equipment) => void;
  editUser: (user?: TeamUser) => void;
  editTraining: (material?: Training) => void;
}

