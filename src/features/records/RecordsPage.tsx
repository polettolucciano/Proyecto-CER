import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { DownloadButton, Empty, Icon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { ModuleSelect, SearchField } from '../../shared/ui/filters';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import type { ModuleId } from '../../types';
import { useExportRecords } from '../reports/useExportRecords';
import { RecordsTable } from './RecordsTable';

const PAGE_SIZE = 8;

export function RecordsPage({ actions, initialModule }: { actions: AppActions; initialModule?: ModuleId }) {
  const data = useVisibleWorkspace();
  const { download, busy } = useExportRecords();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState<string>(initialModule ?? 'all');
  const [result, setResult] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const resetPage = () => setPage(1);

  const records = [...data.records]
    .filter(record =>
      (module === 'all' || record.module === module)
      && (result === 'all' || record.result === result)
      && (lifecycle === 'all' || record.status === lifecycle)
      && (!from || record.date >= from)
      && (!to || record.date <= to)
      && `${record.id} ${moduleById(record.module).name} ${data.users.find(user => user.id === record.userId)?.name} ${record.notes}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  const currentRecords = records.filter(record => record.status === 'active');
  const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const hasFilters = from || to || module !== 'all' || query || result !== 'all' || lifecycle !== 'all';

  function clearFilters() {
    setQuery(''); setModule('all'); setResult('all'); setLifecycle('all'); setFrom(''); setTo(''); setPage(1);
  }

  return <><PageHeader eyebrow="TRAZABILIDAD" title="Historial de controles" description="Todos los registros del centro, ordenados y siempre a mano."><DownloadButton busy={busy} onClick={() => void download(records)} /><button className="button primary" onClick={() => actions.newRecord(module === 'all' ? undefined : module as ModuleId)}><Icon name="Plus" size={17} />Nuevo control</button></PageHeader><div className="record-summary"><div><span className="summary-icon blue"><Icon name="FileText" /></span><strong>{records.length}</strong><span>versiones encontradas</span></div><div><span className="dot teal" /><strong>{currentRecords.filter(record => record.result === 'ok').length}</strong><span>vigentes conformes</span></div><div><span className="dot amber" /><strong>{currentRecords.filter(record => record.result === 'attention').length}</strong><span>vigentes con observaciones</span></div></div><section className="panel"><div className="filter-bar"><SearchField value={query} onChange={value => { setQuery(value); resetPage(); }} placeholder="Buscar un control o responsable…" /><ModuleSelect value={module} onChange={value => { setModule(value); resetPage(); }} /><select aria-label="Filtrar por resultado" value={result} onChange={event => { setResult(event.target.value); resetPage(); }}><option value="all">Todos los resultados</option><option value="ok">Conforme</option><option value="attention">Con observaciones</option></select><select aria-label="Filtrar por vigencia" value={lifecycle} onChange={event => { setLifecycle(event.target.value); resetPage(); }}><option value="all">Todas las versiones</option><option value="active">Vigentes</option><option value="superseded">Rectificadas</option><option value="voided">Anuladas</option></select></div><div className="date-filters"><Icon name="CalendarDays" size={16} /><label>Desde<input type="date" value={from} onChange={event => { setFrom(event.target.value); resetPage(); }} /></label><span>—</span><label>Hasta<input type="date" value={to} min={from} onChange={event => { setTo(event.target.value); resetPage(); }} /></label>{hasFilters && <button className="text-button" onClick={clearFilters}>Limpiar filtros<Icon name="X" size={13} /></button>}</div>{records.length ? <RecordsTable records={records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} actions={actions} /> : <Empty icon="Search" title="No encontramos controles" description="Probá con otros filtros o registrá un nuevo control." />}<div className="pagination"><span>{records.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, records.length)} de ${records.length} versiones` : '0 registros'}</span><div><button className="icon-button" aria-label="Página anterior" disabled={current <= 1} onClick={() => setPage(current - 1)}><Icon name="ChevronLeft" size={17} /></button><span>{current} / {pages}</span><button className="icon-button" aria-label="Página siguiente" disabled={current >= pages} onClick={() => setPage(current + 1)}><Icon name="ChevronRight" size={17} /></button></div></div></section></>;
}

