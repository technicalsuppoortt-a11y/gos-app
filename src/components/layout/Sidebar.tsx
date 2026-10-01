import React from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CircleHelp, Crown, LogOut, X, Rocket } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';

export interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  dividerBefore?: boolean;
  end?: boolean;
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
  const signOut = () => { dispatch(logout()); close(); navigate('/auth/login', { replace: true }); };

  const content = <div className="layout-sidebar-content">
    <NavLink to={basePath} className="layout-brand" onClick={close}>
      <span className="layout-brand-wordmark"><b>GOS</b><Rocket size={20} strokeWidth={2.2}/></span>
      <span className="layout-brand-copy"><small>Growth Operating System</small></span>
    </NavLink>
    <nav className="layout-nav" aria-label="Main navigation">
      {items.map(item => <React.Fragment key={item.name}>
        {item.dividerBefore && <div className="layout-nav-divider"/>}
        <NavLink to={`${basePath}${item.href}`} end={item.end ?? true} onClick={close} className={({ isActive }) => `layout-nav-item${isActive ? ' is-active' : ''}`}>
          <item.icon size={17} strokeWidth={1.8}/><span>{item.name}</span>{item.badge && <span className="layout-nav-badge">{item.badge}</span>}
        </NavLink>
      </React.Fragment>)}
    </nav>
    <div className="layout-sidebar-bottom">
      <button className="layout-profile"><span className="layout-profile-avatar">MJ</span><span className="layout-profile-copy"><b>Mohamed Joe</b><small>Business Owner</small></span><span className="layout-plan"><Crown size={12}/> Pro</span></button>
      <div className="layout-help-card"><span className="layout-help-icon"><CircleHelp size={17}/></span><div><b>Need Help?</b><small>Guides and support</small></div><button aria-label="Open help center"><ArrowRight size={14}/></button><a href="#help">View guides</a></div>
      <button className="layout-logout" onClick={signOut}><LogOut size={15}/><span>Log out</span></button>
    </div>
  </div>;

  return <>
    <aside className={`layout-sidebar${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`} aria-label="Workspace sidebar">{content}</aside>
    <AnimatePresence>{isOpen && <><motion.button aria-label="Close navigation" className="layout-mobile-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}/><motion.aside className={`layout-mobile-sidebar${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`} initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: .2 }}>{content}<button className="layout-mobile-close" onClick={close} aria-label="Close menu"><X size={18}/></button></motion.aside></>}</AnimatePresence>
  </>;
};
