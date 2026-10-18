import { useUILanguage, localizeNode, translateText, uiDirection } from '../../i18n/display';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Crown,
  LogOut,
  X,
  Rocket
} from 'lucide-react';
import './sidebar-settings.css';
import { settingsAliases } from '../../pages/settings/navigation';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setSidebarOpen, toggleSidebarCollapse } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';
import { logoutFirebase } from '../../backend/session';

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

function SidebarEntry({
  item,
  basePath,
  close,
  isCollapsed
}: {
  item: SidebarItem;
  basePath: string;
  close: () => void;
  isCollapsed?: boolean;
}) {
  useUILanguage();
  const location = useLocation();
  const menuId = useId();
  const pathname = location.pathname.replace(/\/$/, '');
  const inside = location.pathname.startsWith(basePath + item.href) || !!item.activePaths?.some(path => location.pathname === path);
  const [expanded, setExpanded] = useState(inside);
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (inside && item.children) setExpanded(true);
  }
  const segment = pathname.split('/').at(-1) ?? '';
  const canonicalPath = pathname === '/dashboard/integrations'
    ? '/dashboard/settings/integrations'
    : settingsAliases[segment]
    ? pathname.slice(0, -segment.length) + settingsAliases[segment]
    : pathname;

  return (
    <div className={`layout-nav-group${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="layout-nav-parent">
        <NavLink
          to={`${basePath}${item.href}`}
          end={item.end ?? true}
          onClick={() => { if (item.children) setExpanded(true); else close(); }}
          className={({ isActive }) => `layout-nav-item${isActive || item.activePaths?.some(path => location.pathname === path || location.pathname.startsWith(path + '/')) ? ' is-active' : ''}`}
          title={isCollapsed ? translateText(item.name) : undefined}
        >
          <item.icon size={17} strokeWidth={1.8} className="layout-nav-icon flex-none" />
          <span className="layout-nav-text">{localizeNode(item.name)}</span>
          {localizeNode(item.badge && (
            <span className="layout-nav-badge" title={isCollapsed ? `${localizeNode(item.badge)} ${translateText("notifications")}` : undefined}>
              {localizeNode(item.badge)}
            </span>
          ))}
        </NavLink>
        {localizeNode(!isCollapsed && item.children && (
          <button
            className="layout-submenu-toggle"
            aria-label={translateText(`${expanded ? 'Collapse' : 'Expand'} ${item.name}`)}
            aria-expanded={expanded}
            aria-controls={menuId}
            onClick={() => setExpanded(value => !value)}
          >
            <ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : undefined }}/>
          </button>
        ))}
      </div>
      {localizeNode(!isCollapsed && item.children && expanded && (
        <nav id={menuId} className="layout-settings-submenu" aria-label={translateText("Settings navigation")}>
          {localizeNode(item.children.map(child => (
            <Link
              key={child.href}
              to={basePath + child.href}
              onClick={close}
              aria-current={canonicalPath === basePath + child.href || (child.href.endsWith('/profile') && pathname === basePath + item.href) ? 'page' : undefined}
              className={`layout-settings-link${canonicalPath === basePath + child.href || (child.href.endsWith('/profile') && pathname === basePath + item.href) ? ' is-active' : ''}`}
            >
              <child.icon size={14}/>
              <span>{localizeNode(child.name)}</span>
            </Link>
          )))}
        </nav>
      ))}
    </div>
  );
}

interface SidebarProps {
  items: SidebarItem[];
  basePath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, basePath }) => {
  useUILanguage();
  const dispatch = useDispatch();
  const platformTenant = useSelector((state: RootState) => state.auth.tenant);
  const phoenixBrand = platformTenant?.id.startsWith('phoenix_') ? platformTenant : null;
  const navigate = useNavigate();
  const isOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const isCollapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isRtl = uiDirection() === 'rtl';
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
    const frame = requestAnimationFrame(() => controls()[0]?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(setSidebarOpen(false));
      if (event.key !== 'Tab') return;
      const nodes = controls(), first = nodes[0], last = nodes.at(-1);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const viewport = () => { if (window.innerWidth >= 768) dispatch(setSidebarOpen(false)); };
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', viewport);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', viewport);
      previous?.focus();
    };
  }, [isOpen, dispatch]);

  const close = () => dispatch(setSidebarOpen(false));
  const signOut = () => {
    showToast.success('You have been logged out successfully.');
    void logoutFirebase().catch(error => showToast.error(error.message));
    close();
    navigate('/auth/login', { replace: true });
  };

  const splitIndex = items.findIndex(item => item.dividerBefore);
  const topItems = splitIndex >= 0 ? items.slice(0, splitIndex) : items;
  const bottomItems = splitIndex >= 0 ? items.slice(splitIndex) : [];

  const renderContent = (collapsed: boolean) => (
    <div className={`layout-sidebar-content${collapsed ? ' is-collapsed' : ''}`}>
      {/* Top brand header with collapse toggle */}
      <div className="layout-brand-row">
        <NavLink
          to={basePath}
          className="layout-brand"
          onClick={close}
          title={collapsed ? translateText("Growth Operating System") : undefined}
        >
          <span className="layout-brand-icon">
            {phoenixBrand?.logo ? <img src={phoenixBrand.logo} alt="" className="h-8 w-8 object-contain" /> : <Rocket size={20} strokeWidth={2.2} className="layout-brand-rocket" />}
          </span>
          <div className="layout-brand-copy">
            <span className="layout-brand-wordmark"><b>{phoenixBrand?.name || translateText("GOS")}</b></span>
            <small>{translateText("Growth Operating System")}</small>
          </div>
        </NavLink>

        {!collapsed && (
          <button
            type="button"
            className="layout-collapse-btn"
            onClick={() => dispatch(toggleSidebarCollapse())}
            aria-label={translateText("Collapse sidebar")}
            title={translateText("Collapse sidebar")}
          >
            {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {collapsed && (
        <div className="layout-collapsed-toggle-wrap">
          <button
            type="button"
            className="layout-collapse-btn is-floating"
            onClick={() => dispatch(toggleSidebarCollapse())}
            aria-label={translateText("Expand sidebar")}
            title={translateText("Expand sidebar")}
          >
            {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      )}

      {/* Internally scrollable navigation tabs container */}
      <div className="layout-nav-scroll-area">
        <nav className="layout-nav" aria-label={translateText("Main navigation")}>
          {localizeNode(topItems.map(item => (
            <React.Fragment key={item.name}>
              {localizeNode(item.dividerBefore && <div className="layout-nav-divider"/>)}
              <SidebarEntry item={item} basePath={basePath} close={close} isCollapsed={collapsed} />
            </React.Fragment>
          )))}
        </nav>

        {localizeNode(bottomItems.length > 0 && (
          <nav className="layout-nav" aria-label={translateText("Utility navigation")} style={{ paddingTop: '8px', marginTop: '16px' }}>
            <div className="layout-nav-divider" style={{ marginTop: 0 }}/>
            {localizeNode(bottomItems.map(item => (
              <React.Fragment key={item.name}>
                <SidebarEntry item={item} basePath={basePath} close={close} isCollapsed={collapsed} />
              </React.Fragment>
            )))}
          </nav>
        ))}
      </div>

      {/* Bottom section */}
      <div className="layout-sidebar-bottom">
        <button
          className="layout-profile"
          title={collapsed ? (currentUser?.name || translateText("Mohamed Joe")) : undefined}
        >
          <span className="layout-profile-avatar">{(currentUser?.name || 'MJ').slice(0, 2).toUpperCase()}</span>
          <span className="layout-profile-copy">
            <b>{currentUser?.name || translateText("Mohamed Joe")}</b>
            <small>{translateText("Business Owner")}</small>
          </span>
          <span className="layout-plan"><Crown size={12}/>{translateText(" Pro")}</span>
        </button>

        <div className="layout-help-card">
          <span className="layout-help-icon"><CircleHelp size={17}/></span>
          <div className="layout-help-copy">
            <b>{translateText("Need Help?")}</b>
            <small>{translateText("Guides and support")}</small>
          </div>
          <button aria-label={translateText("Open help center")}><ArrowRight size={14}/></button>
          <a href="#help">{translateText("View guides")}</a>
        </div>

        <button
          className="layout-logout"
          onClick={signOut}
          title={collapsed ? translateText("Log out") : undefined}
        >
          <LogOut size={15}/>
          <span className="layout-logout-text">{translateText("Log out")}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`layout-sidebar shrink-0${isCollapsed ? ' is-collapsed' : ''}${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`}
        aria-label={translateText("Workspace sidebar")}
      >
        {localizeNode(renderContent(isCollapsed))}
      </aside>

      <AnimatePresence>
        {localizeNode(isOpen && (
          <>
            <motion.button
              aria-label={translateText("Close navigation")}
              className="layout-mobile-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={translateText("Workspace navigation")}
              className={`layout-mobile-sidebar shrink-0${basePath === '/dashboard' ? ' reference-user-sidebar' : ''}`}
              initial={{ x: isRtl ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? 280 : -280 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {localizeNode(renderContent(false))}
              <button className="layout-mobile-close" onClick={close} aria-label={translateText("Close menu")}>
                <X size={18}/>
              </button>
            </motion.aside>
          </>
        ))}
      </AnimatePresence>
    </>
  );
};
