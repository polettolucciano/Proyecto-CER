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
  const [lifecycle, setLifecycle] = useState('active');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [moreFilters, setMoreFilters] = useState(false);
  const records = [...data.records].filter(record =>
    (module === 'all' || record.module === module)
    && (result === 'all' || record.result === result)
    && (lifecycle === 'all' || record.status === lifecycle)
    && (!from || record.date >= from) && (!to || record.date <= to)
    && `${record.id} ${moduleById(record.module).name} ${data.users.find(user => user.id === record.userId)?.name} ${record.notes}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(records.length / PAGE_SIZE)));
  const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const advancedCount = Number(Boolean(from)) + Number(Boolean(to)) + Number(lifecycle !== 'active');
  const hasFilters = advancedCount > 0 || module !== 'all' || query || result !== 'all';
  function clearFilters() {
    setQuery(''); setModule('all'); setResult('all'); setLifecycle('active'); setFrom(''); setTo(''); setPage(1);
  }
  return <>
    <PageHeader title="Historial de controles" description="Consultá los registros y abrí cada control para ver su detalle y versiones.">
      <DownloadButton busy={busy} onClick={() => void download(records)} />
      <button className="button primary" onClick={() => actions.newRecord(module === 'all' ? undefined : module as ModuleId)}><Icon name="Plus" size={17} />Nuevo control</button>
    </PageHeader>
    <section className="panel">
      <div className="filter-bar compact-record-filters">
        <SearchField value={query} onChange={value => { setQuery(value); setPage(1); }} placeholder="Buscar un control o responsable…" />
        <ModuleSelect value={module} onChange={value => { setModule(value); setPage(1); }} />
        <select aria-label="Filtrar por resultado" value={result} onChange={event => { setResult(event.target.value); setPage(1); }}><option value="all">Todos los resultados</option><option value="ok">Conforme</option><option value="attention">Con observaciones</option></select>
        <button className="button secondary small" aria-expanded={moreFilters} aria-controls="advanced-record-filters" onClick={() => setMoreFilters(value => !value)}><Icon name="SlidersHorizontal" size={16} />Más filtros{advancedCount > 0 && <span className="count-pill">{advancedCount}</span>}</button>
      </div>
      <div id="advanced-record-filters" className="date-filters" hidden={!moreFilters}>
        <label>Desde<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
        <label>Versiones<select aria-label="Filtrar por vigencia" value={lifecycle} onChange={event => { setLifecycle(event.target.value); setPage(1); }}><option value="active">Vigentes</option><option value="all">Todas las versiones</option><option value="superseded">Rectificadas</option><option value="voided">Anuladas</option></select></label>
      </div>
      <div className="history-filter-summary"><span>{records.length} {lifecycle === 'active' ? 'controles vigentes' : 'versiones encontradas'}{from || to ? ` · ${from ? `Desde ${from}` : ''}${from && to ? ' · ' : ''}${to ? `Hasta ${to}` : ''}` : ''}</span>{hasFilters && <button className="text-button" onClick={clearFilters}>Limpiar filtros<Icon name="X" size={13} /></button>}</div>
      {records.length ? <RecordsTable records={records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} actions={actions} /> : <Empty icon="Search" title="No encontramos controles" description="Probá con otros filtros o registrá un nuevo control." />}
      <div className="pagination"><span>{records.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, records.length)} de ${records.length}` : '0 registros'}</span><div><button className="icon-button" aria-label="Página anterior" disabled={current <= 1} onClick={() => setPage(current - 1)}><Icon name="ChevronLeft" size={17} /></button><span>{current} / {pages}</span><button className="icon-button" aria-label="Página siguiente" disabled={current >= pages} onClick={() => setPage(current + 1)}><Icon name="ChevronRight" size={17} /></button></div></div>
    </section>
  </>;
}
