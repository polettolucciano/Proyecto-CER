import { useEffect, useState } from 'react';
import { Icon } from './components';
import { modules } from './data';
import { canManage, today, visibleData } from './domain';
import { Dashboard } from './features/dashboard/Dashboard';
import { ReportsPage } from './features/reports/ReportsPage';
import { EquipmentDetail, Notifications, SearchModal, TaskDetail } from './features/shell/AppDialogs';
import { EquipmentForm, RecordDetail, RecordForm, TaskForm, TrainingForm, UserForm } from './forms';
import { MobileNavigation, Sidebar, Topbar } from './layout/AppChrome';
import { navigation } from './navigation';
import { EquipmentPage, Planning, Records, SettingsPage, TrainingPage, UsersPage, type Actions } from './pages';
import { useApp } from './store';
import type { Equipment, MaintenanceRecord, ModuleId, Page, Task, TeamUser, Training } from './types';

type Dialog =
  | { type: 'record'; module?: ModuleId; task?: Task; equipmentId?: string }
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
  const page = navigation.some(item => item.id === path) ? path as Page : 'dashboard';
  const module = new URLSearchParams(query).get('module');
  return { page, module: modules.some(item => item.id === module) ? module as ModuleId : undefined };
}

export default function App() {
  const { data, user, setUserId, saving, storageError } = useApp();
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

  const navigate = (page: Page, module?: ModuleId) => {
    const hash = `#${page}${module ? `?module=${module}` : ''}`;
    if (window.location.hash === hash) setRoute({ page, module });
    else window.location.hash = hash;
    setSidebar(false);
  };

  const actions: Actions = {
    navigate,
    newRecord: (module, task, equipmentId) => setDialog({ type: 'record', module, task, equipmentId }),
    viewRecord: record => setDialog({ type: 'record-detail', record }),
    editTask: task => setDialog({ type: 'task', task }),
    viewTask: task => setDialog({ type: 'task-detail', task }),
    editEquipment: equipment => setDialog({ type: 'equipment', equipment }),
    viewEquipment: equipment => setDialog({ type: 'equipment-detail', equipment }),
    editUser: selectedUser => setDialog({ type: 'user', user: selectedUser }),
    editTraining: material => setDialog({ type: 'training', material }),
  };

  const closeDialog = () => setDialog(null);
  const overdue = visible.tasks.filter(task => task.active && task.due < today()).length;

  function changeProfile(userId: string) {
    setUserId(userId);
    setProfile(false);
    setDialog(null);
    navigate('dashboard');
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      <Sidebar currentPage={route.page} location={data.settings.location} overdue={overdue} open={sidebar} user={user} onClose={() => setSidebar(false)} onNavigate={navigate} />
      <div className="app-main">
        <Topbar currentPage={route.page} overdue={overdue} profileOpen={profile} user={user} users={data.users} onMenu={() => setSidebar(true)} onNotifications={() => setDialog({ type: 'notifications' })} onProfileChange={changeProfile} onProfileToggle={() => setProfile(value => !value)} onSearch={() => setDialog({ type: 'search' })} />
        <div className="preview-strip premium-preview" role="status">
          <span><Icon name="Monitor" size={14} /><strong>Demostración</strong><span className="preview-detail">Datos de ejemplo · Sin conexión a Supabase</span></span>
          <span className={storageError ? 'storage-warning' : ''}><i className={saving ? 'saving-dot' : 'saved-dot'} />{storageError ? 'Revisar almacenamiento' : saving ? 'Guardando…' : 'Guardado en este navegador'}</span>
        </div>
        {storageError && <div className="storage-error" role="alert"><Icon name="TriangleAlert" size={17} />{storageError}</div>}
        <main id="main-content" className="main-content" tabIndex={-1}>
          {route.page === 'dashboard' && <Dashboard actions={actions} />}
          {route.page === 'planning' && <Planning actions={actions} />}
          {route.page === 'records' && <Records key={`${user.id}-${route.module ?? ''}`} actions={actions} initialModule={route.module} />}
          {route.page === 'equipment' && <EquipmentPage actions={actions} />}
          {route.page === 'reports' && <ReportsPage />}
          {route.page === 'training' && <TrainingPage actions={actions} />}
          {route.page === 'users' && <UsersPage actions={actions} />}
          {route.page === 'settings' && <SettingsPage />}
        </main>
        <footer className="app-footer"><span>Centro de Enfermedades Renales</span><span>Prototipo frontend · Datos de demostración</span></footer>
      </div>

      <MobileNavigation currentPage={route.page} onMenu={() => setSidebar(true)} onNavigate={navigate} onNewRecord={() => actions.newRecord()} />

      {dialog?.type === 'record' && <RecordForm initialModule={dialog.module} initialEquipment={dialog.equipmentId} task={dialog.task} onClose={closeDialog} />}
      {dialog?.type === 'record-detail' && <RecordDetail record={dialog.record} onClose={closeDialog} />}
      {dialog?.type === 'task' && user.role !== 'Responsable técnico' && <TaskForm task={dialog.task} onClose={closeDialog} />}
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
