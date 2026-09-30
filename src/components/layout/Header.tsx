import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Plus, Search } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'A clear view of what’s happening across your workspace.' },
  '/dashboard/booking': { title: 'Booking & Calendar', description: 'Create booking links, manage your availability and let clients book appointments with you.' },
  '/dashboard/funnels': { title: 'Funnel & Website', description: 'Build and manage the paths that turn visitors into customers.' },
  '/dashboard/templates': { title: 'Templates', description: 'Start with a proven page or funnel design.' },
  '/dashboard/integrations': { title: 'Integrations', description: 'Connect the tools that keep your business in sync.' },
  '/dashboard/inbox': { title: 'Inbox', description: 'All your customer conversations, together in one place.' },
  '/dashboard/crm': { title: 'CRM & Leads', description: 'Build relationships and keep your pipeline moving.' },
  '/dashboard/follow-up': { title: 'AI Follow-up', description: 'Thoughtful follow-ups that help every lead move forward.' },
  '/dashboard/products': { title: 'Products & Payments', description: 'Manage your offers, products and connected payments.' },
  '/dashboard/analytics': { title: 'Analytics', description: 'Understand performance across your business.' },
};

interface HeaderProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, actionLabel, onMenu }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const copy = pageCopy[location.pathname] ?? { title: 'Workspace settings', description: 'Manage your workspace and business preferences.' };
  const pageTitle = title ?? copy.title;
  const ctaText = actionLabel ?? (location.pathname === '/dashboard/booking' ? 'Create Booking Link' : 'Create new');

  const isFunnels = location.pathname === '/dashboard/funnels';
  return <header className="layout-header">
    <div className="layout-header-title">
      <button className="layout-menu-button" onClick={onMenu ?? (() => dispatch(toggleSidebar()))} aria-label="Open navigation"><Menu size={19}/></button>
      <div className="layout-header-breadcrumb"><span>Workspace</span><i>/</i><h1>{pageTitle}</h1></div>
    </div>
    <div className="layout-header-actions">
      <label className="layout-search"><Search size={16}/><input aria-label="Search" placeholder="Search anything..."/><kbd>⌘ K</kbd></label>
      <div className="layout-preference-controls"><LanguageSwitcher/><ThemeToggle/></div>
      <button className="layout-notifications" aria-label="Notifications"><Bell size={18}/><i/></button>
      <button className="layout-header-user"><span className="layout-profile-avatar">MJ</span><span><b>Mohamed Joe</b><small>Business Owner</small></span><ChevronDown size={14}/></button>
      <button className="layout-header-cta" onClick={() => isFunnels ? navigate('/dashboard/funnels') : navigate('/dashboard/booking?create=link')}><Plus size={17}/>{isFunnels ? 'Publish' : ctaText}<ChevronDown size={14}/></button>
    </div>
  </header>;
};
