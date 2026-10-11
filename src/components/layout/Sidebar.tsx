import React, { useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, CircleHelp, Crown, LogOut, X, Rocket } from 'lucide-react';
import './sidebar-settings.css';
import { settingsAliases } from '../../pages/settings/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

export interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  dividerBefore?: boolean;
  end?: boolean;
  activePaths?: string[];
  children?: SidebarItem[];
}

function SidebarEntry({ item, basePath, close }: { item: SidebarItem; basePath: string; close: () => void }) {
  const location = useLocation();
  const menuId = useId();
  const pathname = location.pathname.replace(/\/$/, '');
  const inside = location.pathname.startsWith(basePath + item.href) || !!item.activePaths?.some(path => location.pathname === path);
  const [expanded, setExpanded] = useState(inside);
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) { setLastPath(location.pathname); if (inside && item.children) setExpanded(true); }
  const segment = pathname.split('/').at(-1) ?? '';
  const canonicalPath = pathname === '/dashboard/integrations' ? '/dashboard/settings/integrations' : settingsAliases[segment] ? pathname.slice(0, -segment.length) + settingsAliases[segment] : pathname;
  return <div className="layout-nav-group"><div className="layout-nav-parent"><NavLink to={`${basePath}${item.href}`} end={item.end ?? true} onClick={() => { if (item.children) setExpanded(true); else close(); }} className={({ isActive }) => `layout-nav-item${isActive || item.activePaths?.some(path => location.pathname === path || location.pathname.startsWith(path + '/')) ? ' is-active' : ''}`}>
    <item.icon size={17} strokeWidth={1.8}/><span>{item.name}</span>{item.badge && <span className="layout-nav-badge">{item.badge}</span>}
  </NavLink>{item.children && <button className="layout-submenu-toggle" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`} aria-expanded={expanded} aria-controls={menuId} onClick={() => setExpanded(value => !value)}><ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : undefined }}/></button>}</div>
  {item.children && expanded && <nav id={menuId} className="layout-settings-submenu" aria-label="Settings navigation">{item.children.map(child => <Link key={child.href} to={basePath + child.href} onClick={close} aria-current={canonicalPath === basePath + child.href || (child.href.endsWith('/profile') && pathname === basePath + item.href) ? 'page' : undefined} className={`layout-settings-link${canonicalPath === basePath + child.href || (child.href.endsWith('/profile') && pathname === basePath + item.href) ? ' is-active' : ''}`}><child.icon size={14}/><span>{child.name}</span></Link>)}</nav>}
  </div>;
}

interface SidebarProps {
  items: SidebarItem[];
  basePath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, basePath }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const close = () => dispatch(setSidebarOpen(false));
  const signOut = () => { showToast.success('You have been logged out successfully.'); dispatch(logout()); close(); navigate('/auth/login', { replace: true }); };

  const splitIndex = items.findIndex(item => item.dividerBefore);
  const topItems = splitIndex >= 0 ? items.slice(0, splitIndex) : items;
  const bottomItems = splitIndex >= 0 ? items.slice(splitIndex) : [];

  const content = <div className="layout-sidebar-content">
    <NavLink to={basePath} className="layout-brand" onClick={close}>
      <span className="layout-brand-wordmark"><b>GOS</b><Rocket size={20} strokeWidth={2.2}/></span>
      <span className="layout-brand-copy"><small>Growth Operating System</small></span>
    </NavLink>

    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-start', minHeight: 0, overflowY: 'auto' }}>
      <nav className="layout-nav" aria-label="Main navigation" style={{ flex: 'none', gap: '7px', overflow: 'visible', paddingTop: 0 }}>
        {topItems.map(item => <React.Fragment key={item.name}>
          {item.dividerBefore && <div className="layout-nav-divider"/>}
          <SidebarEntry item={item} basePath={basePath} close={close}/>
        </React.Fragment>)}
      </nav>

      {bottomItems.length > 0 && <nav className="layout-nav" aria-label="Utility navigation" style={{ flex: 'none', gap: '7px', overflow: 'visible', paddingTop: '10px', marginTop: '24px' }}>
        <div className="layout-nav-divider" style={{ marginTop: 0 }}/>
        {bottomItems.map(item => <React.Fragment key={item.name}>
          <SidebarEntry item={item} basePath={basePath} close={close}/>
        </React.Fragment>)}
      </nav>}
    </div>
    <div className="layout-sidebar-bottom">
      <button className="layout-profile"><span className="layout-profile-avatar">MJ</span><span className="layout-profile-copy"><b>Mohamed Joe</b><small>Business Owner</small></span><span className="layout-plan"><Crown size={12}/> Pro</span></button>
      <div className="layout-help-card"><span className="layout-help-icon"><CircleHelp size={17}/></span><div><b>Need Help?</b><small>Guides and support</small></div><button aria-label="Open help center"><ArrowRight size={14}/></button><a href="#help">View guides</a></div>
      <button className="layout-logout" onClick={signOut}><LogOut size={15}/><span>Log out</span></button>
    </div>
  </div>;

  return <>
    <aside className={`layout-sidebar shrink-0${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`} aria-label="Workspace sidebar">{content}</aside>
    <AnimatePresence>{isOpen && <><motion.button aria-label="Close navigation" className="layout-mobile-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}/><motion.aside className={`layout-mobile-sidebar shrink-0${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`} initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: .2 }}>{content}<button className="layout-mobile-close" onClick={close} aria-label="Close menu"><X size={18}/></button></motion.aside></>}</AnimatePresence>
  </>;
};
