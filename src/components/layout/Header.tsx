import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, ChevronDown, Menu, Search, Sparkles, User, Settings, LogOut } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AnimatePresence, motion } from 'framer-motion';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'A clear view of what’s happening across your workspace.' },
  '/dashboard/booking': { title: 'Booking & Calendar', description: 'Create booking links, manage your availability and let clients book appointments with you.' },
  '/dashboard/funnels': { title: 'Funnel & Website', description: 'Build and manage the paths that turn visitors into customers.' },
  '/dashboard/templates': { title: 'Templates', description: 'Start with a proven page or funnel design.' },
  '/dashboard/integrations': { title: 'Integrations', description: 'Connect the tools that keep your business in sync.' },
  '/dashboard/inbox': { title: 'Inbox', description: 'Manage all your customer conversations in one place.' },
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

export const Header: React.FC<HeaderProps> = ({ title, onMenu }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const copy = pageCopy[location.pathname] ?? { title: 'Workspace settings', description: 'Manage your workspace and business preferences.' };
  const pageTitle = title ?? copy.title;
  const isDiscountEditor = /^\/dashboard\/products-payments\/discounts\/(?:new|[^/]+\/edit)\/?$/.test(location.pathname);
  const isDiscountEdit = isDiscountEditor && /\/edit\/?$/.test(location.pathname);
  const isDiscountDashboard = ['/dashboard/products', '/dashboard/products-payments'].includes(location.pathname) && new URLSearchParams(location.search).get('tab') === 'discounts';
  const discountTitle = isDiscountEdit ? 'Edit Discount' : 'Create New Discount';
  const backToDiscounts = () => navigate('/dashboard/products-payments?tab=discounts');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return <header className={`layout-header${isDiscountEditor ? ' discount-flow-header' : ''}`}>
    <div className="layout-header-title">
      <button className="layout-menu-button" onClick={onMenu ?? (() => dispatch(toggleSidebar()))} aria-label="Open navigation"><Menu size={19}/></button>
      {isDiscountEditor && <button type="button" className="discount-header-back" onClick={backToDiscounts} aria-label="Back to Discounts"><ArrowLeft size={18}/></button>}
      {isDiscountEditor || isDiscountDashboard ? <nav className="layout-header-breadcrumb discount-header-breadcrumb" aria-label="Breadcrumb"><button type="button" onClick={() => navigate('/dashboard/products-payments')}>Products &amp; Payments</button><i aria-hidden="true">/</i>{isDiscountEditor ? <><button type="button" onClick={backToDiscounts}>Discounts</button><i aria-hidden="true">/</i><h1 aria-current="page">{discountTitle}</h1></> : <h1 aria-current="page">Discounts</h1>}</nav> : <div className="layout-header-breadcrumb"><span>Workspace</span><i>/</i><h1>{pageTitle}</h1></div>}
    </div>
    <div className="layout-header-actions">
      {isDiscountEditor ? <div className="discount-header-buttons"><button type="button" className="discount-header-cancel" onClick={backToDiscounts}>Cancel</button><button type="submit" form="discount-editor-form" className="discount-header-save"><Sparkles size={16}/>{isDiscountEdit ? 'Save Changes' : 'Create Discount'}</button></div> : <label className="layout-search"><Search size={16}/><input aria-label="Search" placeholder="Search anything..."/><kbd>⌘ K</kbd></label>}
      <div className="layout-preference-controls"><LanguageSwitcher/><ThemeToggle/></div>
      <button className="layout-notifications" aria-label="Notifications"><Bell size={18}/><i/></button>
      
      <div className="relative" ref={profileRef}>
        <button 
          className="layout-header-user" 
          onClick={() => setProfileOpen(!profileOpen)}
          aria-expanded={profileOpen}
        >
          <span className="layout-profile-avatar">MJ</span>
          <span><b>Mohamed Joe</b><small>Business Owner</small></span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}/>
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl bg-white shadow-[0_10px_35px_-5px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden z-50 dark:bg-gray-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-500/20 dark:text-indigo-400">MJ</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">Mohamed Joe</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">mohamed@example.com</span>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button onClick={() => { navigate('/dashboard/settings/profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <User size={15} className="text-gray-400" /> View Profile
                </button>
                <button onClick={() => { navigate('/dashboard/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <Settings size={15} className="text-gray-400" /> Account Settings
                </button>
              </div>
              <div className="p-1.5 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { showToast.success('You have been logged out successfully.'); dispatch(logout()); navigate('/auth/login', { replace: true }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-500/10">
                  <LogOut size={15} /> Log Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </header>;
};
