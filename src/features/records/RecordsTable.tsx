import type { AppActions } from '../../app/actions';
import { Avatar, Badge, Empty, Icon, ModuleIcon } from '../../components';
import { moduleById } from '../../data';
import { formatDate } from '../../domain';
import { useApp } from '../../store';
import type { MaintenanceRecord } from '../../types';

export function RecordsTable({ records, actions, compact = false }: { records: MaintenanceRecord[]; actions: AppActions; compact?: boolean }) {
  const { data } = useApp();

  if (!records.length) return <Empty title="Todavía no hay registros" description="Los controles que registres aparecerán acá." />;

  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Control / módulo</th><th>Fecha</th><th>Responsable</th><th>Resultado</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{records.map(record => {
    const owner = data.users.find(user => user.id === record.userId);
    const label = record.status === 'voided' ? 'Anulado' : record.status === 'superseded' ? 'Rectificado' : record.result === 'ok' ? 'Conforme' : 'Con observaciones';
    return <tr key={record.id} className={record.status !== 'active' ? 'historical-record' : ''}><td><button className="table-link" onClick={() => actions.viewRecord(record)}><ModuleIcon module={record.module} small /><span><strong>{moduleById(record.module).name}</strong><small>{compact ? data.equipment.find(equipment => equipment.id === record.equipmentId)?.code : `${record.id} · Rev. ${record.revision}`}</small></span></button></td><td className="nowrap">{formatDate(record.date)}</td><td><span className="user-cell"><Avatar initials={owner?.initials ?? '—'} className="tiny-avatar" />{owner?.name ?? 'Sin asignar'}</span></td><td><Badge>{label}</Badge></td><td><button className="icon-button" aria-label={`Ver registro ${record.id}`} onClick={() => actions.viewRecord(record)}><Icon name="ArrowUpRight" size={17} /></button></td></tr>;
  })}</tbody></table></div>;
}

