import { useEffect, useState } from 'react';
import type { AppActions } from './app/actions';
import { Icon } from './components';
import { modules } from './data';
import { allowed, canAccessPage, canManage, canPlan, today, visibleData } from './domain';
import { Dashboard } from './features/dashboard/Dashboard';
import { EquipmentForm } from './features/equipment/EquipmentForm';
import { EquipmentPage } from './features/equipment/EquipmentPage';
import { TaskForm } from './features/planning/TaskForm';
import { PlanningPage } from './features/planning/PlanningPage';
import { OperationalRecordForm } from './features/records/OperationalRecordForm';
import { RecordDetail } from './features/records/RecordDetail';
import { RecordsPage } from './features/records/RecordsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PublicTrainingPage } from './features/training/PublicTrainingPage';
import { TrainingForm } from './features/training/TrainingForm';
import { TrainingPage } from './features/training/TrainingPage';
import { UserForm } from './features/users/UserForm';
import { UsersPage } from './features/users/UsersPage';
import { EquipmentDetail, Notifications, SearchModal, TaskDetail } from './features/shell/AppDialogs';
import { MobileNavigation, Sidebar, Topbar } from './layout/AppChrome';
import { navigation } from './navigation';
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
  | { type: 'search' }
  | { type: 'notifications' };

function readRoute(): { page: Page; module?: ModuleId } {
  const [path, query] = window.location.hash.replace('#', '').split('?');
  const page = path === 'public-training' || navigation.some(item => item.id === path) ? path as Page : 'dashboard';
  const module = new URLSearchParams(query).get('module');
  return { page, module: modules.some(item => item.id === module) ? module as ModuleId : undefined };
}

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
    if (!canAccessPage(user, route.page)) window.location.hash = '#dashboard';
  }, [route.page, user]);

  const navigate = (page: Page, module?: ModuleId) => {
    const destination = canAccessPage(user, page) ? page : 'dashboard';
    const hash = `#${destination}${module && destination === page ? `?module=${module}` : ''}`;
    if (window.location.hash === hash) setRoute({ page: destination, module: destination === page ? module : undefined });
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
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      <Sidebar currentPage={currentPage} overdue={overdue} open={sidebar} user={user} onClose={() => setSidebar(false)} onNavigate={navigate} />
      <div className="app-main">
        <Topbar currentPage={currentPage} overdue={overdue} profileOpen={profile} user={user} users={data.users} onMenu={() => setSidebar(true)} onNotifications={() => setDialog({ type: 'notifications' })} onProfileChange={changeProfile} onProfileToggle={() => setProfile(value => !value)} onSearch={() => setDialog({ type: 'search' })} />
        <div className="preview-strip premium-preview" role="status">
          <span><Icon name="Monitor" size={14} /><strong>{remote?'CER':'Demostración'}</strong><span className="preview-detail">{remote?'Sesión personal · Datos del centro':'Datos de ejemplo · Sin conexión a Supabase'}</span></span>
          <span className={storageError ? 'storage-warning' : ''}><i className={saving ? 'saving-dot' : 'saved-dot'} />{storageError ? 'Revisar conexión' : saving ? 'Guardando…' : remote?'Conectado al centro':'Guardado en este navegador'}</span>
        </div>
        {storageError && <div className="storage-error" role="alert"><Icon name="TriangleAlert" size={17} />{storageError}{remote && <button onClick={()=>void refresh()}>Actualizar datos</button>}</div>}
        <main id="main-content" className="main-content" tabIndex={-1}>
          {currentPage === 'dashboard' && <Dashboard actions={actions} />}
          {currentPage === 'planning' && <PlanningPage actions={actions} />}
          {currentPage === 'records' && <RecordsPage key={`${user.id}-${route.module ?? ''}`} actions={actions} initialModule={route.module} />}
          {currentPage === 'equipment' && <EquipmentPage actions={actions} />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'training' && <TrainingPage onEdit={actions.editTraining} />}
          {currentPage === 'users' && <UsersPage actions={actions} />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
        <footer className="app-footer"><span>Centro de Enfermedades Renales</span><span>{remote?'Gestión operativa CER':'Prototipo frontend · Datos de demostración'}</span></footer>
      </div>

      <MobileNavigation user={user} currentPage={currentPage} onMenu={() => setSidebar(true)} onNavigate={navigate} onNewRecord={() => actions.newRecord()} />

      {dialog?.type === 'record' && <OperationalRecordForm initialModule={dialog.module} initialEquipment={dialog.equipmentId} task={dialog.task} sourceRecord={dialog.sourceRecord} onClose={closeDialog} />}
      {dialog?.type === 'record-detail' && <RecordDetail record={dialog.record} onClose={closeDialog} onCorrect={() => setDialog({ type: 'record', sourceRecord: dialog.record })} />}
      {dialog?.type === 'task' && canPlan(user) && <TaskForm task={dialog.task} onClose={closeDialog} />}
      {dialog?.type === 'equipment' && canManage(user) && <EquipmentForm equipment={dialog.equipment} onClose={closeDialog} />}
      {dialog?.type === 'user' && canManage(user) && <UserForm member={dialog.user} onClose={closeDialog} />}
      {dialog?.type === 'training' && canManage(user) && <TrainingForm material={dialog.material} onClose={closeDialog} />}
      {dialog?.type === 'task-detail' && <TaskDetail task={dialog.task} actions={actions} onClose={closeDialog} />}
      {dialog?.type === 'equipment-detail' && <EquipmentDetail equipment={dialog.equipment} actions={actions} onClose={closeDialog} />}
      {dialog?.type === 'search' && <SearchModal actions={actions} onClose={closeDialog} />}
      {dialog?.type === 'notifications' && <Notifications actions={actions} onClose={closeDialog} />}
    </div>
  );
}
