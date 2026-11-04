import { useEffect, useState } from 'react';
import type { AppActions } from './app/actions';
import { Icon } from './components';
import { allowed, canAccessPage, canManage, canPlan, today, visibleData } from './domain';
import { EquipmentForm } from './features/equipment/EquipmentForm';
import { EquipmentPage } from './features/equipment/EquipmentPage';
import { TaskForm } from './features/planning/TaskForm';
import { PlanningPage } from './features/planning/PlanningPage';
import { OperationalRecordForm } from './features/records/OperationalRecordForm';
import { RecordDetail } from './features/records/RecordDetail';
import { RecordsPage } from './features/records/RecordsPage';
import { AdministrationPage } from './features/settings/AdministrationPage';
import { PublicTrainingPage } from './features/training/PublicTrainingPage';
import { TrainingForm } from './features/training/TrainingForm';
import { TrainingPage } from './features/training/TrainingPage';
import { UserForm } from './features/users/UserForm';
import { EquipmentDetail, SearchModal, TaskDetail } from './features/shell/AppDialogs';
import { MobileNavigation, Sidebar, Topbar } from './layout/AppChrome';
import { isLegacyRoute, parseRoute, routeHash } from './routing';
import { useApp } from './store';
import type { Equipment, MaintenanceRecord, ModuleId, Page, Task, TeamUser, Training } from './types';

type Dialog =
  | { type: 'record'; module?: ModuleId; task?: Task; equipmentId?: string; sourceRecord?: MaintenanceRecord }
  | { type: 'record-detail'; record: MaintenanceRecord }
  | { type: 'task'; task?: Task }
  | { type: 'task-detail'; task: Task }
  | { type: 'equipment'; equipment?: Equipment }
  | { type: 'equipment-detail'; equipment: Equipment }
  | { type: 'user'; user?: TeamUser }
  | { type: 'training'; material?: Training }
  | { type: 'search' };

const readRoute = () => parseRoute(window.location.hash);

export default function App() {
  const { data, user, setUserId, saving, storageError,remote,refresh } = useApp();
  const visible = visibleData(data, user);
  const [route, setRoute] = useState(readRoute);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [profile, setProfile] = useState(false);

  useEffect(() => {
    function onHashChange() { setRoute(readRoute()); setSidebar(false); window.scrollTo({ top: 0 }); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDialog({ type: 'search' }); }
      if (event.key === 'Escape') { setSidebar(false); setProfile(false); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isLegacyRoute(window.location.hash)) window.history.replaceState(null, '', routeHash(route));
  }, [route]);

  useEffect(() => {
    if (!canAccessPage(user, route.page)) window.location.hash = '#dashboard';
  }, [route.page, user]);

  const navigate = (page: Page, module?: ModuleId, equipmentId?: string, view?: string) => {
    const hash = routeHash(canAccessPage(user, page) ? { page, module, equipmentId, view } : { page: 'dashboard' });
    if (window.location.hash === hash) { setRoute(readRoute()); window.scrollTo({ top: 0 }); }
    else window.location.hash = hash;
    setSidebar(false);
  };

  const actions: AppActions = {
    navigate,
    newRecord: (module, task, equipmentId) => { if (!module || allowed(user, module)) setDialog({ type: 'record', module, task, equipmentId }); },
    viewRecord: record => { if (allowed(user, record.module)) setDialog({ type: 'record-detail', record }); },
    editTask: task => { if (canPlan(user)) setDialog({ type: 'task', task }); },
    viewTask: task => { if (allowed(user, task.module)) setDialog({ type: 'task-detail', task }); },
    editEquipment: equipment => { if (canManage(user)) setDialog({ type: 'equipment', equipment }); },
    viewEquipment: equipment => { if (allowed(user, equipment.module)) setDialog({ type: 'equipment-detail', equipment }); },
    editUser: selectedUser => { if (canManage(user)) setDialog({ type: 'user', user: selectedUser }); },
    editTraining: material => { if (canManage(user)) setDialog({ type: 'training', material }); },
  };

  const closeDialog = () => setDialog(null);
  const overdue = visible.tasks.filter(task => task.active && task.due < today()).length;

  function changeProfile(userId: string) {
    setUserId(userId);
    setProfile(false);
    setDialog(null);
    navigate('dashboard');
  }

  if (route.page === 'public-training') return <PublicTrainingPage />;

  const currentPage = canAccessPage(user, route.page) ? route.page : 'dashboard';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Ir al contenido</a>
      <Sidebar currentPage={currentPage} overdue={overdue} open={sidebar} user={user} onClose={() => setSidebar(false)} onNavigate={navigate} />
      <div className="app-main">
        <Topbar currentPage={currentPage} profileOpen={profile} user={user} users={data.users} onMenu={() => setSidebar(true)} onProfileChange={changeProfile} onProfileToggle={() => setProfile(value => !value)} onSearch={() => setDialog({ type: 'search' })} />
        <div className="preview-strip premium-preview" role="status">
          <span><Icon name="Monitor" size={14} /><strong>{remote?'CER':'Demostración'}</strong><span className="preview-detail">{remote?'Sesión personal · Datos del centro':'Datos de ejemplo · Sin conexión a Supabase'}</span></span>
          <span className={storageError ? 'storage-warning' : ''}><i className={saving ? 'saving-dot' : 'saved-dot'} />{storageError ? 'Revisar conexión' : saving ? 'Guardando…' : remote?'Conectado al centro':'Guardado en este navegador'}</span>
        </div>
        {storageError && <div className="storage-error" role="alert"><Icon name="TriangleAlert" size={17} />{storageError}{remote && <button onClick={()=>void refresh()}>Actualizar datos</button>}</div>}
        <main id="main-content" className="main-content" tabIndex={-1}>
          {currentPage === 'dashboard' && <EquipmentPage actions={actions} />}
          {currentPage === 'planning' && <PlanningPage actions={actions} initialView={route.view} onViewChange={view => navigate('planning', undefined, undefined, view)} />}
          {currentPage === 'records' && <RecordsPage key={`${user.id}-${route.module ?? ''}-${route.equipmentId ?? ''}-${route.view ?? ''}`} actions={actions} initialModule={route.module} initialEquipment={route.equipmentId} initialRecent={route.view === 'recent'} />}
          {currentPage === 'training' && <TrainingPage onEdit={actions.editTraining} />}
          {currentPage === 'settings' && <AdministrationPage actions={actions} view={route.view} onViewChange={view => navigate('settings', undefined, undefined, view)} />}
        </main>
        <footer className="app-footer"><span>Centro de Enfermedades Renales</span><span>CER Gestión</span></footer>
      </div>

      <MobileNavigation user={user} currentPage={currentPage} onNavigate={navigate} />

      {dialog?.type === 'record' && <OperationalRecordForm initialModule={dialog.module} initialEquipment={dialog.equipmentId} task={dialog.task} sourceRecord={dialog.sourceRecord} onClose={closeDialog} />}
      {dialog?.type === 'record-detail' && <RecordDetail record={dialog.record} onClose={closeDialog} onCorrect={() => setDialog({ type: 'record', sourceRecord: dialog.record })} />}
      {dialog?.type === 'task' && canPlan(user) && <TaskForm task={dialog.task} onClose={closeDialog} />}
      {dialog?.type === 'equipment' && canManage(user) && <EquipmentForm equipment={dialog.equipment} onClose={closeDialog} />}
      {dialog?.type === 'user' && canManage(user) && <UserForm member={dialog.user} onClose={closeDialog} />}
      {dialog?.type === 'training' && canManage(user) && <TrainingForm material={dialog.material} onClose={closeDialog} />}
      {dialog?.type === 'task-detail' && <TaskDetail task={dialog.task} actions={actions} onClose={closeDialog} />}
      {dialog?.type === 'equipment-detail' && <EquipmentDetail equipment={dialog.equipment} actions={actions} onClose={closeDialog} />}
      {dialog?.type === 'search' && <SearchModal actions={actions} onClose={closeDialog} />}
    </div>
  );
}
