import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, AppWindow, BarChart3, Bell, CreditCard, FileText, LayoutDashboard, LogOut, Puzzle, Search, Settings, Users, ShieldCheck } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import './super-admin.css';

const navigation = [
  { label: 'Overview', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'All Clients', to: '/super-admin/clients', icon: Users },
  { label: 'All Softwares', to: '/super-admin/subscriptions', icon: AppWindow },
  { label: 'Usage & Revenue', to: '/super-admin/analytics', icon: BarChart3 },
  { label: 'Team Management', to: '/super-admin/users', icon: ShieldCheck },
  { label: 'System Settings', to: '/super-admin/settings', icon: Settings },
  { label: 'Templates', to: '/super-admin/templates', icon: FileText },
  { label: 'Integrations', to: '/super-admin/integrations', icon: Puzzle },
  { label: 'Payments', to: '/super-admin/payments', icon: CreditCard },
  { label: 'Logs & Monitoring', to: '/super-admin/logs', icon: Activity },
];

export const SuperAdminLayout: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const signOut = () => { dispatch(logout()); navigate('/auth/login', { replace: true }); };

  return <div className="sa-shell">
    <aside className="sa-sidebar">
      <a className="sa-brand" href="/super-admin"><span className="sa-brand-mark">G</span><span><b>AI Sales OS</b><small>Platform control</small></span></a>
      <div className="sa-nav-label">PLATFORM</div>
      <nav className="sa-nav" aria-label="Super admin navigation">
        {navigation.map(({ label, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `sa-nav-link${isActive ? ' active' : ''}`}><Icon size={15}/><span>{label}</span></NavLink>)}
      </nav>
      <button className="sa-logout" onClick={signOut}><LogOut size={15}/>Log out</button>
    </aside>
    <main className="sa-main">
      <header className="sa-topbar"><span className="sa-breadcrumb">Platform <i>/</i> Super Admin</span><label className="sa-search"><Search size={14}/><input placeholder="Search..." aria-label="Search platform"/><kbd>⌘ K</kbd></label><div className="sa-preferences"><LanguageSwitcher/><ThemeToggle/></div><button className="sa-notifications" aria-label="Notifications"><Bell size={17}/><i/></button><button className="sa-account"><span>JA</span><b>Jordan Admin</b></button></header>
      <div className="sa-content"><Outlet/></div>
    </main>
  </div>;
};
