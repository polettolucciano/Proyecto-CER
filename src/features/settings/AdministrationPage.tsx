import type { AppActions } from '../../app/actions';
import { PageHeader } from '../../components';
import { canManage } from '../../domain';
import { SectionTabs } from '../../shared/ui/SectionTabs';
import { useApp } from '../../store';
import { UsersPage } from '../users/UsersPage';
import { SettingsPage } from './SettingsPage';

export function AdministrationPage({ actions, view, onViewChange }: { actions: AppActions; view?: string; onViewChange: (view: string) => void }) {
  const { user } = useApp();
  const admin = canManage(user);
  const active = admin && view !== 'center' ? 'team' : 'center';
  return <>
    <PageHeader title="Administración" description="Personas, permisos y preferencias del centro." />
    {admin && <SectionTabs label="Vistas de administración" page="settings" value={active} items={[{ value: 'team', label: 'Personas y permisos' }, { value: 'center', label: 'Preferencias del centro' }]} onChange={onViewChange} />}
    {active === 'team' ? <UsersPage actions={actions} embedded /> : <SettingsPage embedded />}
  </>;
}
