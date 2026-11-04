import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { DownloadButton, Empty, Icon, PageHeader } from '../../components';
import { HistorySummary } from './HistorySummary';
import { addDays, today } from '../../domain';
import { moduleById } from '../../data';
import { ModuleSelect, SearchField } from '../../shared/ui/filters';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import type { ModuleId } from '../../types';
import { useExportRecords } from '../reports/useExportRecords';
import { RecordsTable } from './RecordsTable';

const PAGE_SIZE = 8;

export function RecordsPage({ actions, initialModule, initialEquipment, initialRecent = false }: { actions: AppActions; initialModule?: ModuleId; initialEquipment?: string; initialRecent?: boolean }) {
  const data = useVisibleWorkspace();
  const { download, busy } = useExportRecords();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState<string>(initialModule ?? 'all');
  const [equipmentId, setEquipmentId] = useState(initialEquipment ?? 'all');
  const selectedEquipment = data.equipment.find(item => item.id === equipmentId);
  const [result, setResult] = useState('all');
  const [lifecycle, setLifecycle] = useState('active');
  const [from, setFrom] = useState(initialRecent ? addDays(today(), -30) : '');
  const [to, setTo] = useState(initialRecent ? today() : '');
  const [page, setPage] = useState(1);
  const [moreFilters, setMoreFilters] = useState(false);
  const records = [...data.records].filter(record =>
    (module === 'all' || record.module === module)
    && (equipmentId === 'all' || record.equipmentId === equipmentId)
    && (result === 'all' || record.result === result)
    && (lifecycle === 'all' || record.status === lifecycle)
    && (!from || record.date >= from) && (!to || record.date <= to)
    && `${record.id} ${moduleById(record.module).name} ${data.users.find(user => user.id === record.userId)?.name} ${record.notes}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const current = Math.min(page, Math.max(1, Math.ceil(records.length / PAGE_SIZE)));
  const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const advancedCount = Number(Boolean(from)) + Number(Boolean(to)) + Number(lifecycle !== 'active') + Number(module !== 'all') + Number(result !== 'all');
  const hasFilters = advancedCount > 0 || equipmentId !== 'all' || module !== 'all' || query || result !== 'all';
  function clearFilters() {
    setQuery(''); setModule('all'); setEquipmentId('all'); setResult('all'); setLifecycle('active'); setFrom(''); setTo(''); setPage(1);
    actions.navigate('records');
  }
  return <>
    <PageHeader title={selectedEquipment ? `Historial · ${selectedEquipment.name}` : 'Historial de controles'} description="Todos los controles realizados, sus observaciones y exportaciones.">
      <DownloadButton busy={busy} onClick={() => void download(records)} />

    </PageHeader>
    {selectedEquipment && <button className="text-button history-back" onClick={() => actions.navigate('dashboard')}><Icon name="ArrowLeft" size={15} />Volver a Inicio</button>}
    <div className="history-period-toolbar"><div className="period-shortcuts" aria-label="Período del historial"><button aria-pressed={!from && !to} onClick={() => { setFrom(''); setTo(''); setPage(1); }}>Todo el historial</button><button aria-pressed={from === addDays(today(), -30) && to === today()} onClick={() => { setFrom(addDays(today(), -30)); setTo(today()); setPage(1); }}>Últimos 30 días</button></div></div>
    <section className="panel">
      <div className="filter-bar compact-record-filters">
        <SearchField value={query} onChange={value => { setQuery(value); setPage(1); }} placeholder="Buscar un control o responsable…" />

        <select aria-label="Filtrar por equipo o sector" value={equipmentId} onChange={event => { setEquipmentId(event.target.value); setPage(1); }}><option value="all">Todos los equipos y sectores</option>{data.equipment.filter(item => module === 'all' || item.module === module).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>

        <button className="button secondary small" aria-expanded={moreFilters} aria-controls="advanced-record-filters" onClick={() => setMoreFilters(value => !value)}><Icon name="SlidersHorizontal" size={16} />Más filtros{advancedCount > 0 && <span className="count-pill">{advancedCount}</span>}</button>
      </div>
      <div id="advanced-record-filters" className="date-filters" hidden={!moreFilters}>
        <ModuleSelect value={module} onChange={value => { setModule(value); setEquipmentId('all'); setPage(1); }} />
        <select aria-label="Filtrar por resultado" value={result} onChange={event => { setResult(event.target.value); setPage(1); }}><option value="all">Todos los resultados</option><option value="ok">Conforme</option><option value="attention">Con observaciones</option></select>
        <label>Desde<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
        <label>Versiones<select aria-label="Filtrar por vigencia" value={lifecycle} onChange={event => { setLifecycle(event.target.value); setPage(1); }}><option value="active">Vigentes</option><option value="all">Todas las versiones</option><option value="superseded">Rectificadas</option><option value="voided">Anuladas</option></select></label>
      </div>
      <HistorySummary records={records} />
      {hasFilters && <div className="history-filter-summary"><span>Filtros aplicados{from || to ? ` · ${from ? `Desde ${from}` : ''}${from && to ? ' · ' : ''}${to ? `Hasta ${to}` : ''}` : ''}</span><button className="text-button" onClick={clearFilters}>Limpiar filtros<Icon name="X" size={13} /></button></div>}
      {records.length ? <RecordsTable records={records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} actions={actions} /> : <Empty icon="Search" title="No encontramos controles" description="Probá con otros filtros. Para realizar un control, elegí el sector en Inicio." />}
      <div className="pagination"><span>{records.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, records.length)} de ${records.length}` : '0 registros'}</span><div><button className="icon-button" aria-label="Página anterior" disabled={current <= 1} onClick={() => setPage(current - 1)}><Icon name="ChevronLeft" size={17} /></button><span>{current} / {pages}</span><button className="icon-button" aria-label="Página siguiente" disabled={current >= pages} onClick={() => setPage(current + 1)}><Icon name="ChevronRight" size={17} /></button></div></div>
    </section>
  </>;
}
