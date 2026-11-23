import { logoutFirebase } from '../../backend/session';
import { useUILanguage, translateText, translateTextForLanguage, localizeNode } from '../../i18n/display';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Menu, Search, Sparkles, User, Settings, LogOut, X } from 'lucide-react';
import { matchesLocalizedSearch } from '../../utils/arabicSearch';
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
import { useModuleAccess, moduleForPath } from '../../pages/settings/useModuleAccess';

const pageCopy: Record<string, { title: string; description: string }> = {
  '/dashboard/marketing-tracking': { title: 'Marketing Tracking', description: 'Pixels, events and conversion insights.' },
  '/admin/tools': { title: 'All Tools Management', description: 'Platform-wide feature controls and native tools configuration.' },
  '/admin/users': { title: 'Sub Accounts', description: 'Invite and manage your workspace sub-accounts.' },
  '/admin': { title: 'Dashboard', description: 'Workspace administration.' },
  '/dashboard/settings/billing': { title: 'Plans & Billing', description: 'Your subscription, credits and available plans.' },
  '/dashboard': { title: 'Dashboard', description: 'A clear view of what’s happening across your workspace.' },
  '/dashboard/booking': { title: 'Booking & Calendar', description: 'Create booking links, manage your availability and let clients book appointments with you.' },
  '/dashboard/funnels': { title: 'Funnel & Website', description: 'Build and manage the paths that turn visitors into customers.' },
  '/dashboard/websites': { title: 'Websites', description: 'Build and manage your websites.' },
  '/dashboard/forms': { title: 'Forms', description: 'Build forms and manage submissions.' },
  '/dashboard/copilot': { title: 'AI Copilot', description: 'Work with your business assistant.' },
  '/dashboard/integrations': { title: 'Integrations', description: 'Connect the tools that keep your business in sync.' },
  '/dashboard/inbox': { title: 'Inbox', description: 'Manage all your customer conversations in one place.' },
  '/dashboard/crm': { title: 'CRM & Leads', description: 'Build relationships and keep your pipeline moving.' },
  '/dashboard/contacts': { title: 'Contacts', description: 'View and manage all your customer contacts and leads.' },
  '/dashboard/automation': { title: 'Automation & Campaign', description: 'Automations, campaigns, follow-ups and templates in one place.' },
  '/dashboard/follow-up': { title: 'AI Follow-up', description: 'Thoughtful follow-ups that help every lead move forward.' },
  '/dashboard/products': { title: 'Products & Payments', description: 'Manage your offers, products and connected payments.' },
  '/dashboard/products-payments': { title: 'Products & Payments', description: 'Manage your offers, products and connected payments.' },
  '/dashboard/analytics': { title: 'Analytics', description: 'Understand performance across your business.' },
  '/dashboard/knowledge': { title: 'Business Knowledge', description: 'Manage the sources that your assistant uses.' },
  '/dashboard/activity': { title: 'Activity Log', description: 'View changes and events in your workspace.' },
  '/dashboard/content': { title: 'Content Generator', description: 'Create content for your business.' },
  '/dashboard/academy': { title: 'Upklick Academy', description: 'Explore learning resources.' },
  '/dashboard/settings/privacy': { title: 'Privacy Policy', description: 'Review how we protect your personal and business data.' },
};

const ADMIN_SEARCH_ITEMS = [
  { title: 'Dashboard', path: '/admin', category: 'Admin' },
  { title: 'Sub Accounts', path: '/admin/users', category: 'Admin' },
  { title: 'Plans & Billing', path: '/admin/plans', category: 'Billing' },
  { title: 'Funnels & Websites', path: '/admin/funnels', category: 'Management' },
  { title: 'CRM & Leads Management', path: '/admin/crm', category: 'Management' },
  { title: 'Booking & Calendar', path: '/admin/booking', category: 'Management' },
  { title: 'Products & Payments', path: '/admin/products', category: 'Management' },
  { title: 'Templates', path: '/admin/templates', category: 'Management' },
  { title: 'All Tools Management', path: '/admin/tools', category: 'Admin' },
  { title: 'Domains', path: '/admin/domains', category: 'Admin' },
  { title: 'Marketing Tracking', path: '/admin/marketing-tracking', category: 'Admin' },
  { title: 'Business Assets', path: '/admin/business-assets', category: 'Admin' },
  { title: 'Settings', path: '/admin/settings', category: 'Settings' },
  { title: 'Integrations & Webhooks', path: '/admin/integrations', category: 'Settings' },
  { title: 'AI Models & Usage', path: '/admin/ai-usage', category: 'Settings' },
  { title: 'Transactions', path: '/admin/transactions', category: 'Settings' },
  { title: 'Support', path: '/admin/support', category: 'Support' },
];

const USER_SEARCH_ITEMS = [
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
  { title: 'My Purchases', path: '/dashboard/products?tab=products&sub=purchases', category: 'Products' },
  { title: 'Customer Portal', path: '/portal', category: 'Products' },
  { title: 'Checkout Requests', path: '/dashboard/products?tab=requests', category: 'Products' },
  { title: 'Orders', path: '/dashboard/products?tab=orders', category: 'Products' },
  { title: 'Transactions', path: '/dashboard/products?tab=transactions', category: 'Products' },
  { title: 'Customers', path: '/dashboard/products?tab=customers', category: 'Products' },
  { title: 'Discounts', path: '/dashboard/products?tab=discounts', category: 'Products' },
  { title: 'Analytics', path: '/dashboard/analytics', category: 'Navigation' },
  { title: 'Plans & Billing', path: '/dashboard/settings/billing', category: 'Settings' },
  { title: 'Profile Settings', path: '/dashboard/settings/profile', category: 'Settings' },
  { title: 'Business Settings', path: '/dashboard/settings/business', category: 'Settings' },
  { title: 'Team & roles', path: '/dashboard/settings/team', category: 'Settings' },
  { title: 'Domains', path: '/dashboard/settings/domains', category: 'Settings' },
  { title: 'Settings', path: '/dashboard/settings', category: 'Navigation' },
  { title: 'Support', path: '/dashboard/support', category: 'Navigation' },
  { title: 'Integrations', path: '/dashboard/integrations', category: 'Settings' },
];

interface HeaderProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenu }) => {
  const uiLang = useUILanguage();
  const ar = uiLang.startsWith('ar');
  const workspaceBackLabel = ar ? 'الرجوع إلى مساحة العمل' : translateText('Back to Workspace');
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);
  const canAccess = useModuleAccess();

  const agency = currentUser?.accountType === 'agency';
  const subOwnerId = currentUser?.ownerId || currentUser?.id || null;
  const { data: subscription } = useSubscription(agency ? null : subOwnerId);
  const planLabel = agency
    ? ar
      ? 'الفوترة المشتركة'
      : translateText('Shared billing')
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

  const isAdminSurface = location.pathname.startsWith('/admin');
  const dashboardSection = location.pathname.match(/^\/dashboard\/[^/]+/)?.[0];
  const copy = pageCopy[location.pathname] ?? (dashboardSection ? pageCopy[dashboardSection] : undefined) ?? { title: 'Workspace settings', description: 'Manage your workspace and business preferences.' };
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
  const productName = product ? product.name : (productId === 'new' ? translateText('Create Product') : '');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchableNav = useMemo(() => {
    if (isAdminSurface) return ADMIN_SEARCH_ITEMS;
    const baseUserItems = USER_SEARCH_ITEMS.filter(item => {
      if (item.path === '/portal' || item.path === '/dashboard/support') return true;
      const cleanPath = item.path.split('?')[0];
      if (cleanPath === '/dashboard/settings') return canAccess('settings');
      if (cleanPath.startsWith('/dashboard/settings/')) {
        const slug = cleanPath.replace('/dashboard/settings/', '');
        return canAccess(`settings:${slug}`);
      }
      return canAccess(moduleForPath(cleanPath));
    });
    const productItems = canAccess('products')
      ? products.slice(0, 20).map(p => ({
          title: p.name,
          path: `/dashboard/products-payments/products/${p.id}/edit`,
          category: p.type,
        }))
      : [];
    return [...baseUserItems, ...productItems];
  }, [isAdminSurface, canAccess, products]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchableNav.filter(item =>
      matchesLocalizedSearch(searchQuery, [
        item.title,
        translateText(item.title),
        translateTextForLanguage(item.title, 'ar'),
        translateTextForLanguage(item.title, 'nl'),
        translateTextForLanguage(item.title, 'de'),
        item.category,
        translateText(item.category),
      ]),
    );
  }, [searchQuery, searchableNav, uiLang]);

  useEffect(() => {
    setActiveSearchIdx(0);
  }, [searchQuery]);

  const handleSearchSubmit = (targetPath?: string) => {
    const chosen = targetPath || searchResults[activeSearchIdx]?.path || searchResults[0]?.path;
    if (chosen) {
      navigate(chosen);
      setSearchQuery('');
      setSearchOpen(false);
      setActiveSearchIdx(0);
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'k' || event.code === 'KeyK')) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
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

  const hasSearchQuery = searchQuery.trim().length > 0;

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
          <i aria-hidden="true">/</i><h1 className="min-w-0 truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] inline-block align-bottom" dir="auto" title={productName} aria-current="page">{productName}</h1>
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
        <div className="relative layout-search-wrap" ref={searchContainerRef}>
          <label
            className="layout-search"
            onClick={() => {
              searchInputRef.current?.focus();
            }}
          >
            <Search size={15} className="shrink-0" />
            <input 
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-expanded={searchOpen && hasSearchQuery}
              aria-controls="header-search-listbox"
              aria-autocomplete="list"
              aria-label={translateText("Search")} 
              placeholder={translateText("Search...")}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => { setSearchOpen(true); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  if (searchResults.length > 0) {
                    e.preventDefault();
                    setSearchOpen(true);
                    setActiveSearchIdx(prev => (prev + 1) % searchResults.length);
                  }
                } else if (e.key === 'ArrowUp') {
                  if (searchResults.length > 0) {
                    e.preventDefault();
                    setSearchOpen(true);
                    setActiveSearchIdx(prev => (prev - 1 + searchResults.length) % searchResults.length);
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchOpen(false);
                  searchInputRef.current?.blur();
                }
              }}
            />
            {hasSearchQuery ? (
              <button
                type="button"
                className="layout-search-clear"
                aria-label={translateText("Clear search")}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                  setActiveSearchIdx(0);
                  searchInputRef.current?.focus();
                }}
              >
                <X size={13} />
              </button>
            ) : (
              <kbd dir="ltr">⌘K</kbd>
            )}
          </label>
          <AnimatePresence>
            {localizeNode(searchOpen && hasSearchQuery && (
              <motion.div
                id="header-search-listbox"
                role="listbox"
                aria-label={translateText("Search results")}
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="layout-search-results absolute start-0 top-[calc(100%+6px)] min-w-full w-80 max-w-[calc(100vw-24px)] max-h-80 overflow-y-auto rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5"
              >
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 uppercase tracking-wider">
                  {translateText("Pages & Navigation")}
                </div>
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => {
                    const isHighlighted = idx === activeSearchIdx;
                    return (
                      <button
                        key={result.path}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setActiveSearchIdx(idx)}
                        onClick={() => handleSearchSubmit(result.path)}
                        className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 text-xs font-medium rounded-lg transition-colors text-start ${
                          isHighlighted
                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400'
                        }`}
                      >
                        <span className="min-w-0 truncate">{translateText(result.title)}</span>
                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 font-normal">{translateText("Jump to")} ↵</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2.5 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                    {translateText("No matching results")}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}

      <GetAppButton/>
      <div className="layout-preference-controls"><CurrencySelector/><LanguageSwitcher/><ThemeToggle/></div>
      <DemoAccountControl/>
      {localizeNode(
        isTeamMember && ownerDisplayName && (
          <div
            className="layout-team-owner-pill"
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
      <NotificationCenter/>
      
      <div className="relative" ref={profileRef} onKeyDown={event => {
        if (event.key !== 'Escape' || !profileOpen) return;
        event.stopPropagation();
        setProfileOpen(false);
        profileRef.current?.querySelector<HTMLButtonElement>('.layout-header-user')?.focus();
      }}>
        <button 
          className="layout-header-user" 
          onClick={() => setProfileOpen(!profileOpen)}
          aria-label={translateText("Profile menu")}
          aria-controls={profileOpen ? 'workspace-profile-menu' : undefined}
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
                  : translateText('Agency user')
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
              id="workspace-profile-menu"
              className="layout-profile-popup absolute end-0 top-[calc(100%+8px)] w-72 rounded-2xl bg-white shadow-[0_14px_40px_-8px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.06)] overflow-hidden z-50 dark:bg-gray-900 dark:shadow-[0_18px_44px_-10px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.1)]"
            >
              <div className="p-3.5 border-b border-gray-100 dark:border-gray-800">
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
              <div className="p-2 border-b border-gray-100 bg-slate-50/60 space-y-1 dark:border-gray-800 dark:bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => {
                    navigate(role === 'ADMIN' ? '/admin/plans?area=mine' : (agency || isLive(subscription) ? '/dashboard/settings/billing' : '/dashboard/settings/billing?tab=plans'));
                    setProfileOpen(false);
                  }}
                  aria-label={planLabel}
                  className="group flex w-full items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-3 py-2 text-start text-white shadow-xs transition-all hover:brightness-105"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/15 text-white ring-1 ring-inset ring-white/25">
                      <Sparkles size={14} />
                    </span>
                    <span className="truncate text-xs font-semibold text-white">
                      {planLabel}
                    </span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-white/85 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </button>
                <CreditBadge variant="menu" onSelect={() => setProfileOpen(false)} />
                <WalletBadge variant="menu" onSelect={() => setProfileOpen(false)} />
              </div>
              <div className="p-1.5">
                <button onClick={() => { navigate('/dashboard/settings/profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <User size={15} className="text-gray-400" />{translateText(" View Profile")}</button>
                <button onClick={() => { navigate('/dashboard/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800/50">
                  <Settings size={15} className="text-gray-400" />{translateText(" Account Settings")}</button>
              </div>
              <div className="p-1.5 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { showToast.success(translateText('You have been logged out successfully.')); void logoutFirebase().catch(error => showToast.error(error.message)); navigate('/auth/login', { replace: true }); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors dark:text-red-400 dark:hover:bg-red-500/10">
                  <LogOut size={15} />{translateText(" Log Out")}</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  </header>;
};
