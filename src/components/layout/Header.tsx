import { logoutFirebase } from '../../backend/session';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Menu, Search, Sparkles, User, Settings, LogOut, Globe } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { toggleSidebar, toggleSidebarCollapse } from '../../store/slices/uiSlice';
import { showToast } from '../../utils/toast';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { CurrencySelector } from '../ui/CurrencySelector';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AnimatePresence, motion } from 'framer-motion';
import { useProducts } from '../../pages/commerce/repository';
import { NotificationCenter } from './NotificationCenter';
import './product-header.css';
import { GetAppButton } from './GetAppButton';
import { CreditBadge } from './CreditBadge';
import { WalletBadge } from './WalletBadge';
import { DemoAccountControl } from './DemoAccountControl';
import { isLive, useSubscription } from '../../backend/billing';
import { canReturnToLaunchBrandWorkspace, returnToLaunchBrandWorkspace } from '../../branding/launchBrandPreview';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/dashboard/marketing-tracking': { title: 'Marketing Tracking', description: 'Pixels, events and conversion insights.' },
  '/admin/tools': { title: 'All Tools Management', description: 'Platform-wide feature controls and native tools configuration.' },
  '/admin/users': { title: 'Sub Accounts', description: 'Invite and manage your workspace sub-accounts.' },
  '/admin': { title: 'Dashboard', description: 'Workspace administration.' },
  '/dashboard/settings/billing': { title: 'Plans & Billing', description: 'Your subscription, credits and available plans.' },
  '/dashboard': { title: 'Dashboard', description: 'A clear view of what’s happening across your workspace.' },
  '/dashboard/booking': { title: 'Booking & Calendar', description: 'Create booking links, manage your availability and let clients book appointments with you.' },
  '/dashboard/funnels': { title: 'Funnel & Website', description: 'Build and manage the paths that turn visitors into customers.' },
  '/dashboard/integrations': { title: 'Integrations', description: 'Connect the tools that keep your business in sync.' },
  '/dashboard/inbox': { title: 'Inbox', description: 'Manage all your customer conversations in one place.' },
  '/dashboard/crm': { title: 'CRM & Leads', description: 'Build relationships and keep your pipeline moving.' },
  '/dashboard/contacts': { title: 'Contacts', description: 'View and manage all your customer contacts and leads.' },
  '/dashboard/automation': { title: 'Automation & Campaign', description: 'Automations, campaigns, follow-ups and templates in one place.' },
  '/dashboard/follow-up': { title: 'AI Follow-up', description: 'Thoughtful follow-ups that help every lead move forward.' },
  '/dashboard/products': { title: 'Products & Payments', description: 'Manage your offers, products and connected payments.' },
  '/dashboard/analytics': { title: 'Analytics', description: 'Understand performance across your business.' },
  '/dashboard/settings/privacy': { title: 'Privacy Policy', description: 'Review how we protect your personal and business data.' },
};

interface HeaderProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenu }) => {
  const ar = useUILanguage().startsWith('ar');
  const workspaceBackLabel = ar ? 'الرجوع للمساحة' : 'Back to workspace';
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);

  const agency = currentUser?.accountType === 'agency';
  const subOwnerId = currentUser?.ownerId || currentUser?.id || null;
  const { data: subscription } = useSubscription(agency ? null : subOwnerId);
  const planLabel = agency
    ? ar
      ? 'الفوترة المشتركة'
      : 'Shared billing'
    : translateText(isLive(subscription) || currentUser?.isTeamMember ? 'My Plan' : 'Upgrade Plan');
  const initials = (currentUser?.name || 'MJ').slice(0, 2).toUpperCase();
  const isTeamMember = Boolean(currentUser?.isTeamMember);
  const ownerDisplayName = currentUser?.ownerName || '';
  const ownerDisplayEmail = currentUser?.ownerEmail || '';
  const memberRoleLabel = currentUser?.teamRole || 'Team Member';
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

  const productMatch = location.pathname.match(/^\/dashboard\/products-payments\/(?:products|course)\/([^/]+)/);
  const isProductWorkspace = !!productMatch;
  const productId = productMatch ? productMatch[1] : null;
  const products = useProducts();
  const product = isProductWorkspace ? products.find(p => p.id === productId) : null;
  const productName = product ? product.name : (productId === 'new' ? 'Create Product' : '');


  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchableNav = [
    { title: 'Dashboard', path: '/dashboard', category: 'Navigation' },
    { title: 'AI Copilot', path: '/dashboard/copilot', category: 'Navigation' },
    { title: 'Funnel & Website', path: '/dashboard/funnels', category: 'Navigation' },
    { title: 'Inbox', path: '/dashboard/inbox', category: 'Navigation' },
    { title: 'CRM & Leads', path: '/dashboard/crm', category: 'Navigation' },
    { title: 'Contacts', path: '/dashboard/contacts', category: 'Navigation' },
    { title: 'Automation & Campaign', path: '/dashboard/automation', category: 'Navigation' },
    { title: 'AI Follow-Up', path: '/dashboard/follow-up', category: 'Navigation' },
    { title: 'Booking & Calendar', path: '/dashboard/booking', category: 'Navigation' },
    { title: 'Products & Payments', path: '/dashboard/products-payments', category: 'Navigation' },
    { title: 'Analytics', path: '/dashboard/analytics', category: 'Navigation' },
    { title: 'Plans & Billing', path: '/dashboard/settings/billing', category: 'Settings' },
    { title: 'Settings', path: '/dashboard/settings', category: 'Navigation' },
    { title: 'Support', path: '/dashboard/support', category: 'Navigation' },
    { title: 'Integrations', path: '/dashboard/integrations', category: 'Settings' },
  ];

  const searchResults = searchQuery.trim()
    ? searchableNav.filter(item => {
        const query = searchQuery.toLowerCase().trim();
        const translatedTitle = translateText(item.title).toLowerCase();
        return item.title.toLowerCase().includes(query) || translatedTitle.includes(query);
      })
    : [];

  const handleSearchSubmit = (targetPath?: string) => {
    const destination = targetPath || searchResults[0]?.path;
    if (destination) {
      navigate(destination);
      setSearchQuery('');
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return <header className={`layout-header${isDiscountEditor ? ' discount-flow-header' : ''}${isProductWorkspace ? ' product-workspace-header' : ''}`}>
    <div className="layout-header-title">
      <button 
        className="layout-menu-button" 
        onClick={onMenu ?? (() => {
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            dispatch(toggleSidebarCollapse());
          } else {
            dispatch(toggleSidebar());
          }
        })} 
        aria-label={translateText("Toggle navigation")}
        title={translateText("Toggle navigation")}
      >
        <Menu size={19}/>
      </button>
      {localizeNode(isDiscountEditor && <button type="button" className="discount-header-back" onClick={backToDiscounts} aria-label={translateText("Back to Discounts")}><ArrowLeft size={18}/></button>)}
      {localizeNode(isProductWorkspace && <button type="button" className="discount-header-back" onClick={() => navigate('/dashboard/products-payments')} aria-label={translateText("Back to Products")}><ArrowLeft size={18}/></button>)}
      {localizeNode(isProductWorkspace ? (
        <nav className="layout-header-breadcrumb discount-header-breadcrumb" aria-label={translateText("Breadcrumb")}>
          <span>{translateText("Workspace")}</span><i aria-hidden="true">/</i>
          <button type="button" onClick={() => navigate('/dashboard/products-payments')}>{translateText("Products & Payments")}</button>
          <i aria-hidden="true">/</i><h1 className="min-w-0 truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] inline-block align-bottom" title={translateText(productName)} aria-current="page">{localizeNode(productName)}</h1>
        </nav>
      ) : isDiscountEditor || isDiscountDashboard ? <nav className="layout-header-breadcrumb discount-header-breadcrumb" aria-label={translateText("Breadcrumb")}><button type="button" onClick={() => navigate('/dashboard/products-payments')}>{translateText("Products & Payments")}</button><i aria-hidden="true">/</i>{localizeNode(isDiscountEditor ? <><button type="button" onClick={backToDiscounts}>{translateText("Discounts")}</button><i aria-hidden="true">/</i><h1 aria-current="page">{localizeNode(discountTitle)}</h1></> : <h1 aria-current="page">{translateText("Discounts")}</h1>)}</nav> : <div className="layout-header-breadcrumb min-w-0 flex-1"><span>{translateText("Workspace")}</span><i>/</i><h1 className="min-w-0 truncate" title={translateText(pageTitle)}>{localizeNode(pageTitle)}</h1></div>)}
    </div>
    <div className="layout-header-actions">
      {canReturnToLaunchBrandWorkspace() && (
        <button
          type="button"
          className="layout-preview-back"
          onClick={returnToLaunchBrandWorkspace}
          aria-label={workspaceBackLabel}
          title={workspaceBackLabel}
        >
          <ArrowLeft size={13} aria-hidden="true" />
          <span>{workspaceBackLabel}</span>
        </button>
      )}
      {localizeNode(isDiscountEditor ? <div className="discount-header-buttons"><button type="button" className="discount-header-cancel" onClick={backToDiscounts}>{translateText("Cancel")}</button><button type="submit" form="discount-editor-form" className="discount-header-save"><Sparkles size={16}/>{localizeNode(isDiscountEdit ? 'Save Changes' : 'Create Discount')}</button></div> : (
        <div className="relative" ref={searchContainerRef}>
          <label className="layout-search">
            <Search size={15}/>
            <input 
              ref={searchInputRef}
              aria-label={translateText("Search")} 
              placeholder={translateText("Search...")}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
            />
            <kbd>{translateText("⌘ K")}</kbd>
          </label>
          <AnimatePresence>
            {localizeNode(searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute start-0 top-[calc(100%+6px)] w-72 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50 p-1.5"
              >
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 uppercase tracking-wider">
                  {translateText("Pages & Navigation")}
                </div>
                {searchResults.map(result => (
                  <button
                    key={result.path}
                    type="button"
                    onClick={() => handleSearchSubmit(result.path)}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors text-start"
                  >
                    <span>{translateText(result.title)}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{translateText("Jump to")} ↵</span>
                  </button>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
      <button 
        type="button" 
        onClick={() => navigate('/')} 
        className="layout-landing-link inline-flex items-center justify-center w-[34px] h-[34px] shrink-0 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] hover:border-[#7C3AED]/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all shadow-sm"
        title={translateText("View Landing Page")}
        aria-label={translateText("View Landing Page")}
      >
        <Globe size={16} />
      </button>
      <GetAppButton/>
      <div className="layout-preference-controls"><CurrencySelector/><LanguageSwitcher/><ThemeToggle/></div>
      <DemoAccountControl/><div className="layout-balance-badges"><CreditBadge/><WalletBadge/></div>
      {localizeNode(
        isTeamMember && ownerDisplayName && (
          <div
            title={
              ownerDisplayEmail
                ? `${translateText('Workspace Owner')}: ${ownerDisplayName} (${ownerDisplayEmail})`
                : `${translateText('Workspace Owner')}: ${ownerDisplayName}`
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 999,
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              color: '#5b21b6',
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#7c3aed',
                flexShrink: 0,
              }}
            />
            <span>
              {translateText('Owner')}: <b style={{ fontWeight: 700 }}>{ownerDisplayName}</b>
            </span>
          </div>
        ),
      )}
      <button type="button" onClick={() => navigate(role === 'ADMIN' ? '/admin/plans?area=mine' : (agency || isLive(subscription) ? '/dashboard/settings/billing' : '/dashboard/settings/billing?tab=plans'))} aria-label={planLabel} className="layout-plan-cta"><Sparkles size={15}/><span>{planLabel}</span></button>
      <NotificationCenter/>
      
      <div className="relative" ref={profileRef}>
        <button 
          className="layout-header-user" 
          onClick={() => setProfileOpen(!profileOpen)}
          aria-expanded={profileOpen}
        >
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name || ''} className="layout-profile-avatar object-cover" />
          ) : (
            <span className="layout-profile-avatar">{initials}</span>
          )}
          <span>
            <b>{currentUser?.name || translateText("Mohamed Joe")}</b>
            <small>
              {isTeamMember
                ? `${translateText(memberRoleLabel)}${ownerDisplayName ? ` · ${translateText('Owner')}: ${ownerDisplayName}` : ''}`
                : agency
                ? ar
                  ? 'مستخدم وكالة'
                  : 'Agency user'
                : translateText("Business Owner")}
            </small>
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}/>
        </button>

        <AnimatePresence>
          {localizeNode(profileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute end-0 top-[calc(100%+8px)] w-64 rounded-xl bg-white shadow-[0_10px_35px_-5px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden z-50 dark:bg-gray-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name || ''} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold dark:bg-indigo-500/20 dark:text-indigo-400">{initials}</span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{currentUser?.name || translateText("Mohamed Joe")}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</span>
                  </div>
                </div>
                {isTeamMember && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      borderRadius: 9,
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      fontSize: 11.5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>{translateText('Your Role')}:</span>
                      <strong style={{ color: '#6d28d9' }}>{translateText(memberRoleLabel)}</strong>
                    </div>
                    {ownerDisplayName && (
                      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #ddd6fe' }}>
                        <span style={{ display: 'block', fontSize: 10.5, color: '#64748b' }}>
                          {translateText('Workspace Owner')}:
                        </span>
                        <strong style={{ display: 'block', color: '#1e293b', fontSize: 12 }}>
                          {ownerDisplayName}
                        </strong>
                        {ownerDisplayEmail && (
                          <span style={{ display: 'block', fontSize: 10.5, color: '#64748b' }}>
                            {ownerDisplayEmail}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <button onClick={() => { navigate('/dashboard/settings/profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <User size={15} className="text-gray-400" />{translateText(" View Profile")}</button>
                <button onClick={() => { navigate('/dashboard/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <Settings size={15} className="text-gray-400" />{translateText(" Account Settings")}</button>
              </div>
              <div className="p-1.5 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { showToast.success('You have been logged out successfully.'); void logoutFirebase().catch(error => showToast.error(error.message)); navigate('/auth/login', { replace: true }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-500/10">
                  <LogOut size={15} />{translateText(" Log Out")}</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  </header>;
};
