import type { AppActions } from '../../app/actions';
import { Avatar, Badge, Empty, Icon, ModuleIcon } from '../../components';
import { moduleById } from '../../data';
import { formatDate } from '../../domain';
import { useApp } from '../../store';
import type { MaintenanceRecord } from '../../types';

export function RecordsTable({ records, actions, compact = false }: { records: MaintenanceRecord[]; actions: AppActions; compact?: boolean }) {
  const { data } = useApp();
  if (!records.length) return <Empty title="Todavía no hay controles" description="Los controles realizados aparecerán acá." />;
  return <div className="table-scroll record-results"><table className="data-table record-results-table"><thead><tr><th>Control realizado</th><th>Fecha</th><th>Responsable</th><th>Resultado</th></tr></thead><tbody>{records.map(record => {
    const owner = data.users.find(user => user.id === record.userId);
    const equipment = data.equipment.find(item => item.id === record.equipmentId);
    const label = record.status === 'voided' ? 'Anulado' : record.status === 'superseded' ? 'Rectificado' : record.result === 'ok' ? 'Conforme' : 'Con observaciones';
    return <tr key={record.id} className={record.status !== 'active' ? 'historical-record' : ''}>
      <td><button className="table-link record-title-link" aria-label={`Ver control ${record.id} de ${equipment?.name ?? moduleById(record.module).name}`} onClick={() => actions.viewRecord(record)}><ModuleIcon module={record.module} small /><span className="record-title-copy"><strong>{equipment?.name ?? moduleById(record.module).name}</strong><small>{moduleById(record.module).name} · {compact ? equipment?.code : `${record.id} · Rev. ${record.revision}`}</small></span><Icon name="ChevronRight" size={16} /></button></td>
      <td data-label="Fecha" className="nowrap">{formatDate(record.date)}</td>
      <td data-label="Responsable"><span className="user-cell"><Avatar initials={owner?.initials ?? '—'} className="tiny-avatar" />{owner?.name ?? 'Sin asignar'}</span></td>
      <td data-label="Resultado"><Badge>{label}</Badge></td>
    </tr>;
  })}</tbody></table></div>;
}
