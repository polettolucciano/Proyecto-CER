export type ModuleId = 'generator' | 'osmosis' | 'loop' | 'crash' | 'fumigation' | 'electrical' | 'rooms' | 'general';
export type Page = 'dashboard' | 'planning' | 'records' | 'equipment' | 'training' | 'public-training' | 'reports' | 'users' | 'settings';
export type Frequency = 'Diaria' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Única';
export type Role = 'Administrador' | 'Supervisor' | 'Enfermería';
export type Result = 'ok' | 'attention';
export type RecordStatus = 'active' | 'superseded' | 'voided';
export type AuditAction = 'record.created' | 'record.corrected' | 'record.voided';
export type Values = Record<string, string>;
export interface Field { id: string; label: string; type: 'check' | 'number' | 'switch' | 'text' | 'yesno'; hint?: string; optional?: boolean; unit?: string; }
export interface FormSection { title: string; description?: string; fields: Field[]; }
export interface Module { id: ModuleId; name: string; short: string; description: string; color: string; icon: string; frequency: Frequency; defined: boolean; sections: FormSection[]; }
export interface Equipment { id: string; name: string; code: string; module: ModuleId; location: string; model: string; serial: string; status: 'Operativo' | 'En mantenimiento' | 'Fuera de servicio'; }
export interface TeamUser { id: string; name: string; email: string; role: Role; modules: ModuleId[]; active: boolean; initials: string; }
export interface Task { id: string; title: string; module: ModuleId; equipmentId: string; assignedTo: string; frequency: Frequency; due: string; notes: string; active: boolean; lastCompleted?: string; }
export interface Attachment { id: string; name: string; type: string; data: Blob; category?: string; }
export interface MaintenanceRecord { id: string; module: ModuleId; equipmentId: string; taskId?: string; date: string; createdAt: string; userId: string; result: Result; values: Values; notes: string; photos: Attachment[]; status: RecordStatus; revision: number; supersedesId?: string; supersededById?: string; voidedAt?: string; voidedBy?: string; voidReason?: string; }
export interface AuditEvent { id: string; occurredAt: string; actorId: string; action: AuditAction; entityType: 'maintenance-record'; entityId: string; summary: string; relatedEntityId?: string; }
export interface Training { id: string; title: string; description: string; category: string; type: 'Video' | 'Documento' | 'Presentación'; url: string; published: boolean; date: string; }
export interface Settings { organization: string; location: string; advanceDays: number; emailAlerts: boolean; mobileAlerts: boolean; }
export interface Workspace { version: 2; equipment: Equipment[]; users: TeamUser[]; tasks: Task[]; records: MaintenanceRecord[]; auditEvents: AuditEvent[]; training: Training[]; settings: Settings; }
