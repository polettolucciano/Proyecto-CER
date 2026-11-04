import { useEffect, useRef } from 'react';
import { Avatar, Icon } from '../components';
import { canAccessPage, canManage } from '../domain';
import { navigation, pageLabel, primaryNavigation } from '../navigation';
import type { Page, TeamUser } from '../types';
import { useApp } from '../store';

interface SidebarProps {
  currentPage: Page;
  overdue: number;
  open: boolean;
  user: TeamUser;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, overdue, open, user, onClose, onNavigate }: SidebarProps) {
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

        <nav aria-label="Navegación principal">
          <div className="nav-group">{links(navigation.filter(item => primary.includes(item.id) && canAccessPage(user, item.id)))}</div>
          {canManage(user) && <div className="administration-navigation">{links(secondary)}</div>}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-footer"><span className="live-dot" /><span>Sistema CER</span><small>v0.3</small></div>
        </div>
      </aside>
    </>
  );
}

interface TopbarProps {
  currentPage: Page;
  profileOpen: boolean;
  user: TeamUser;
  users: TeamUser[];
  onMenu: () => void;
  onProfileChange: (userId: string) => void;
  onProfileToggle: () => void;
  onSearch: () => void;
}

export function Topbar(props: TopbarProps) {
  const {remote,signOut,refresh}=useApp();
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
        <div className="profile-menu" ref={profileRef}>
          <button className="profile-trigger" aria-label={remote?'Abrir menú de cuenta':'Abrir perfiles de demostración'} aria-expanded={props.profileOpen} onClick={props.onProfileToggle}>
            <Avatar initials={props.user.initials} />
            <span><strong>{!remote && props.user.role === 'Enfermería' ? 'Enfermería' : props.user.name}</strong><small>{props.user.role}</small></span>
            <Icon name="ChevronDown" size={14} />
          </button>
          {props.profileOpen && (
            <div className="profile-dropdown">
              {remote ? <><div className="dropdown-heading">{props.user.name}<small>{props.user.role}</small></div><button onClick={()=>void refresh()}>Actualizar datos</button><button onClick={()=>void signOut()}>Cerrar sesión</button></> : <><div className="dropdown-heading">Perfiles de demostración<small>La autorización real se implementará con el backend.</small></div>
              {(['Administrador', 'Enfermería'] as const).map(role => <section className="demo-role-group" key={role} aria-label={`Probar rol ${role}`}><h3>{role}</h3>{props.users.filter(item => item.active && item.role === role).slice(0, 1).map(item => (
                <button key={item.id} onClick={() => props.onProfileChange(item.id)}>
                  <Avatar initials={item.initials} className="tiny-avatar" />
                  <span><strong>{item.role}</strong><small>{item.role === 'Enfermería' ? 'Todos los controles del equipo' : item.name}</small></span>
                  {item.id === props.user.id && <Icon name="Check" size={16} />}
                </button>
              ))}</section>)}
              {props.users.some(item => item.active && item.role === 'Supervisor') && <details className="legacy-demo-profiles"><summary>Otros perfiles existentes</summary>{props.users.filter(item => item.active && item.role === 'Supervisor').map(item => <button key={item.id} onClick={() => props.onProfileChange(item.id)}><Avatar initials={item.initials} className="tiny-avatar" /><span><strong>{item.role}</strong><small>{item.role === 'Enfermería' ? 'Todos los controles del equipo' : item.name}</small></span>{item.id === props.user.id && <Icon name="Check" size={16} />}</button>)}</details>}</>}
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
  onNavigate: (page: Page) => void;
}

export function MobileNavigation({ user, currentPage, onNavigate }: MobileNavigationProps) {
  const primary = primaryNavigation(user);
  return <nav className="mobile-navigation unified-mobile-navigation" aria-label="Navegación móvil">
    {navigation.filter(item => primary.includes(item.id) && canAccessPage(user, item.id)).map(item =>
      <a key={item.id} href={`#${item.id}`} aria-current={currentPage === item.id ? 'page' : undefined} className={currentPage === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>
        <Icon name={item.icon} size={21} /><span>{item.shortLabel}</span>
      </a>,
    )}
  </nav>;
}
