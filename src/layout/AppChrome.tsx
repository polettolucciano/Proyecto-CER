import { useEffect, useRef } from 'react';
import { Avatar, Icon } from '../components';
import { canAccessPage } from '../domain';
import { navigation, pageLabel, primaryNavigation } from '../navigation';
import type { Page, TeamUser } from '../types';

interface SidebarProps {
  currentPage: Page;
  location: string;
  overdue: number;
  open: boolean;
  user: TeamUser;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, location, overdue, open, user, onClose, onNavigate }: SidebarProps) {
  const primary = primaryNavigation(user);
  const secondary = navigation.filter(item => !primary.includes(item.id) && canAccessPage(user, item.id) && (user.role === 'Administrador' || item.group !== 'Administración'));
  const links = (items: typeof navigation) => items.map(item => (
    <a key={item.id} href={`#${item.id}`} className={`nav-item ${currentPage === item.id ? 'active' : ''}`} aria-current={currentPage === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
      <Icon name={item.icon} size={20} /><span>{pageLabel(item.id, user)}</span>
      {item.id === 'planning' && overdue > 0 && <b className="nav-count">{overdue}</b>}
    </a>
  ));
  return (
    <>
      {open && <button className="sidebar-overlay" aria-label="Cerrar menú de navegación" onClick={onClose} />}
      <aside className={`sidebar premium-sidebar ${open ? 'open' : ''}`} aria-label="Navegación del sistema">
        <a className="brand premium-brand" href="#dashboard" aria-label="CER Gestión, ir al inicio" onClick={() => onNavigate('dashboard')}>
          <span className="brand-mark"><img src="/cer-logo.png" width="54" height="46" alt="" /></span>
          <span className="brand-copy"><strong>CER</strong><small>Gestión operativa</small></span>
        </a>

        <div className="workspace-switch premium-workspace">
          <span className="workspace-symbol"><Icon name="Building2" size={18} /></span>
          <span><strong>{location}</strong><small>Centro de Enfermedades Renales</small></span>
          <span className="status-dot" aria-label="Centro activo" />
        </div>

        <nav aria-label="Navegación principal">
          <div className="nav-group">{links(navigation.filter(item => primary.includes(item.id) && canAccessPage(user, item.id)))}</div>
          <details className="secondary-navigation" key={`${user.id}-${secondary.some(item => item.id === currentPage)}`} open={secondary.some(item => item.id === currentPage) || undefined}>
            <summary><Icon name="SlidersHorizontal" size={18} />{user.role === 'Administrador' ? 'Administración y más' : 'Más herramientas'}<Icon name="ChevronDown" size={15} /></summary>
            {links(secondary)}
          </details>
        </nav>

        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="demo-card-icon"><Icon name="Monitor" size={18} /></span>
            <div><strong>Versión de demostración</strong><p>Los cambios se guardan solamente en este navegador.</p></div>
          </div>
          <div className="sidebar-footer"><span className="live-dot" /><span>Sistema CER</span><small>v0.3</small></div>
        </div>
      </aside>
    </>
  );
}

interface TopbarProps {
  currentPage: Page;
  overdue: number;
  profileOpen: boolean;
  user: TeamUser;
  users: TeamUser[];
  onMenu: () => void;
  onNotifications: () => void;
  onProfileChange: (userId: string) => void;
  onProfileToggle: () => void;
  onSearch: () => void;
}

export function Topbar(props: TopbarProps) {
  const profileRef = useRef<HTMLDivElement>(null);
  const title = pageLabel(props.currentPage, props.user);
  useEffect(() => {
    if (!props.profileOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) props.onProfileToggle();
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [props.profileOpen, props.onProfileToggle]);
  return (
    <header className="topbar premium-topbar">
      <div className="topbar-title">
        <button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={props.onMenu}><Icon name="Menu" /></button>
        <span className="mobile-wordmark"><img src="/cer-logo.png" width="36" height="30" alt="" />CER</span>
        <div><small>Centro de Enfermedades Renales</small><strong>{title}</strong></div>
      </div>
      <div className="topbar-actions">
        <button className="global-search" onClick={props.onSearch} aria-label="Buscar en CER">
          <Icon name="Search" size={18} /><span>Buscar equipo, tarea o registro</span><kbd>⌘ K</kbd>
        </button>
        <button className="icon-button notification-button" aria-label={`${props.overdue} tareas vencidas`} onClick={props.onNotifications}>
          <Icon name="Bell" size={20} />{props.overdue > 0 && <i />}
        </button>
        <div className="profile-menu" ref={profileRef}>
          <button className="profile-trigger" aria-label="Abrir perfiles de demostración" aria-expanded={props.profileOpen} onClick={props.onProfileToggle}>
            <Avatar initials={props.user.initials} />
            <span><strong>{props.user.name}</strong><small>{props.user.role}</small></span>
            <Icon name="ChevronDown" size={14} />
          </button>
          {props.profileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-heading">Perfiles de demostración<small>La autorización real se implementará con el backend.</small></div>
              {(['Administrador', 'Enfermería'] as const).map(role => <section className="demo-role-group" key={role} aria-label={`Probar rol ${role}`}><h3>{role}</h3>{props.users.filter(item => item.active && item.role === role).map(item => (
                <button key={item.id} onClick={() => props.onProfileChange(item.id)}>
                  <Avatar initials={item.initials} className="tiny-avatar" />
                  <span><strong>{item.role}</strong><small>{item.name}</small></span>
                  {item.id === props.user.id && <Icon name="Check" size={16} />}
                </button>
              ))}</section>)}
              {props.users.some(item => item.active && item.role === 'Supervisor') && <details className="legacy-demo-profiles"><summary>Otros perfiles existentes</summary>{props.users.filter(item => item.active && item.role === 'Supervisor').map(item => <button key={item.id} onClick={() => props.onProfileChange(item.id)}><Avatar initials={item.initials} className="tiny-avatar" /><span><strong>{item.role}</strong><small>{item.name}</small></span>{item.id === props.user.id && <Icon name="Check" size={16} />}</button>)}</details>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface MobileNavigationProps {
  user: TeamUser;
  currentPage: Page;
  onMenu: () => void;
  onNavigate: (page: Page) => void;
  onNewRecord: () => void;
}

export function MobileNavigation({ user, currentPage, onMenu, onNavigate, onNewRecord }: MobileNavigationProps) {
  const items: Array<{ page: Page; label: string; icon: string }> = [
    { page: 'dashboard', label: user.role === 'Enfermería' ? 'Hoy' : 'Resumen', icon: 'LayoutDashboard' },
    { page: 'planning', label: 'Agenda', icon: 'CalendarDays' },
    { page: 'records', label: 'Historial', icon: 'ClipboardCheck' },
  ];
  return (
    <nav className="mobile-navigation" aria-label="Navegación móvil">
      {items.slice(0, 2).map(item => (
        <a key={item.page} href={`#${item.page}`} className={currentPage === item.page ? 'active' : ''} onClick={() => onNavigate(item.page)}>
          <Icon name={item.icon} size={21} /><span>{item.label}</span>
        </a>
      ))}
      <button className="mobile-create" onClick={onNewRecord} aria-label="Registrar nuevo control"><Icon name="Plus" size={25} /><span>Registrar</span></button>
      <a href="#records" className={currentPage === 'records' ? 'active' : ''} onClick={() => onNavigate('records')}>
        <Icon name="ClipboardCheck" size={21} /><span>Historial</span>
      </a>
      <button className="mobile-more" onClick={onMenu}><Icon name="MoreHorizontal" size={22} /><span>Más</span></button>
    </nav>
  );
}
