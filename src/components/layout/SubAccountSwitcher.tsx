import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Building2, 
  ChevronsUpDown, 
  Search, 
  Check, 
  ArrowRightLeft, 
  ShieldCheck, 
  Users, 
  X, 
  Loader2, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import type { RootState } from '../../store';
import { useAdminUsers } from '../../backend/adminUsers';
import { switchToUser, returnToAdmin } from '../../backend/impersonation';
import { showToast } from '../../utils/toast';
import { translateText } from '../../i18n/display';
import type { Invite } from '../../pages/onboarding/onboarding-store';

const CACHE_KEY = 'admin_sub_accounts_cache';

const AVATAR_COLORS = [
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface SubAccountSwitcherProps {
  isCollapsed?: boolean;
  className?: string;
}

export function SubAccountSwitcher({ isCollapsed = false, className = '' }: SubAccountSwitcherProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width?: number }>({ top: 0, left: 0, width: 340 });

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);
  const impersonation = useSelector((state: RootState) => state.auth.impersonation);

  const isImpersonating = !!impersonation;
  const isAdminOrImpersonating = role === 'ADMIN' || role === 'SUPER_ADMIN' || isImpersonating;

  // Live admin users query
  const { invites: liveInvites } = useAdminUsers();

  // Cache persistence for seamless switching while impersonating
  useEffect(() => {
    if (liveInvites && liveInvites.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(liveInvites));
      } catch {}
    }
  }, [liveInvites]);

  // Read accounts from live query or cached store
  const allSubAccounts = useMemo<Invite[]>(() => {
    if (liveInvites && liveInvites.length > 0) {
      return liveInvites;
    }
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as Invite[];
      }
    } catch {}
    return [];
  }, [liveInvites]);

  // Update floating popover position relative to trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 340;
    const isRtl = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';

    let left = isRtl ? (rect.right - popoverWidth) : rect.left;
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }

    let top = rect.bottom + 6;
    const estimatedHeight = 410;
    if (top + estimatedHeight > window.innerHeight - 10) {
      if (rect.top - estimatedHeight - 6 > 10) {
        top = rect.top - estimatedHeight - 6;
      } else {
        top = Math.max(10, window.innerHeight - estimatedHeight - 10);
      }
    }

    setPosition({ top, left, width: popoverWidth });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const onResizeOrScroll = () => updatePosition();
      window.addEventListener('resize', onResizeOrScroll);
      window.addEventListener('scroll', onResizeOrScroll, true);
      return () => {
        window.removeEventListener('resize', onResizeOrScroll);
        window.removeEventListener('scroll', onResizeOrScroll, true);
      };
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard accessibility: Escape closes dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSubAccounts;
    return allSubAccounts.filter(acc => 
      (acc.name && acc.name.toLowerCase().includes(q)) ||
      (acc.email && acc.email.toLowerCase().includes(q)) ||
      (acc.tenantId && acc.tenantId.toLowerCase().includes(q))
    );
  }, [allSubAccounts, searchQuery]);

  // Admin Account Details
  const adminAccount = useMemo(() => {
    if (impersonation) {
      return {
        id: impersonation.user.id,
        name: impersonation.user.name || translateText('Main Admin Account'),
        email: impersonation.user.email || '',
        role: impersonation.role,
      };
    }
    return {
      id: currentUser?.id || 'admin',
      name: currentUser?.name || translateText('Main Admin Account'),
      email: currentUser?.email || '',
      role: role || 'ADMIN',
    };
  }, [impersonation, currentUser, role]);

  // Currently active account name
  const activeLabel = isImpersonating 
    ? (currentUser?.name || translateText('Sub-Account')) 
    : (adminAccount.name || translateText('Main Workspace'));

  // Switch to a Sub-Account
  const handleSwitchTo = async (account: Invite) => {
    if (isImpersonating && currentUser?.id === account.id) {
      setIsOpen(false);
      return;
    }

    setSwitchingId(account.id);
    try {
      if (isImpersonating) {
        await returnToAdmin();
      }
      await switchToUser(account.id, account.tenantId);
      localStorage.setItem('activeSubAccountId', account.id);
      showToast.success(translateText(`Switched to ${account.name || account.email}`));
      setIsOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not switch to sub-account';
      showToast.error(msg);
    } finally {
      setSwitchingId(null);
    }
  };

  // Switch back to Main Admin Account
  const handleSwitchToAdmin = async () => {
    if (!isImpersonating) {
      setIsOpen(false);
      return;
    }

    setSwitchingId('main');
    try {
      const targetPath = await returnToAdmin();
      localStorage.removeItem('activeSubAccountId');
      showToast.success(translateText('Switched back to Main Admin Account'));
      setIsOpen(false);
      navigate(targetPath, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not return to admin';
      showToast.error(msg);
    } finally {
      setSwitchingId(null);
    }
  };

  // Do not render switcher for regular users
  if (!isAdminOrImpersonating) {
    return null;
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Full-width Sidebar Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setIsOpen(!isOpen);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={isCollapsed ? activeLabel : undefined}
        aria-label={translateText('Switch Sub-Account / Workspace')}
        className={`group w-full flex items-center ${
          isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
        } rounded-xl text-xs font-semibold transition-all duration-200 border ${
          isImpersonating
            ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 text-amber-900 dark:text-amber-200'
            : isOpen
            ? 'bg-[#7C3AED]/10 border-[#7C3AED] text-[#7C3AED] dark:bg-[#7C3AED]/20 dark:text-[#A78BFA]'
            : 'bg-white/80 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/80 hover:border-[#7C3AED]/60 dark:hover:border-[#7C3AED]/60 text-gray-800 dark:text-gray-200 shadow-sm'
        }`}
        style={{ minHeight: '44px' }}
      >
        {/* Left Side: Avatar Badge + Account Copy */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
            isImpersonating
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : 'bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white shadow-sm shadow-purple-500/30'
          }`}>
            {isImpersonating ? (
              <Users size={14} strokeWidth={2.5} />
            ) : (
              <Building2 size={14} strokeWidth={2.5} />
            )}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 text-start leading-tight">
              <span className="truncate font-bold text-xs text-gray-900 dark:text-gray-100">
                {activeLabel}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                {isImpersonating ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    {translateText('Sub-Account')}
                  </span>
                ) : (
                  <span>{translateText('Main Workspace')}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Chevron Selector Icon */}
        {!isCollapsed && (
          <ChevronsUpDown 
            size={14} 
            className={`text-gray-400 transition-colors flex-shrink-0 ms-1.5 ${
              isOpen ? 'text-[#7C3AED]' : 'group-hover:text-gray-600 dark:group-hover:text-gray-200'
            }`} 
          />
        )}
      </button>

      {/* Floating Popover Portal (Renders to body to prevent clipping from sidebar overflow) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: 99999,
              }}
              className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.18),0_0_0_1px_rgba(124,58,237,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden"
              role="dialog"
              aria-label={translateText('Account Switcher Menu')}
            >
              {/* Top Search Bar */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute start-3 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={translateText('Search sub-accounts...')}
                    className="w-full ps-9 pe-8 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute end-2.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label={translateText('Clear search')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Impersonation Banner: Quick Return to Admin Button */}
              {isImpersonating && (
                <div className="p-3 border-b border-amber-200/60 dark:border-amber-900/40 bg-amber-500/10 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        {translateText('Currently Viewing Sub-Account')}
                      </p>
                      <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 truncate">
                        {currentUser?.name || currentUser?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchToAdmin}
                      disabled={switchingId === 'main'}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-sm shadow-purple-500/20 transition-all disabled:opacity-50"
                    >
                      {switchingId === 'main' ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ArrowRightLeft size={12} />
                      )}
                      <span>{translateText('Switch to Admin')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Accounts List */}
              <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                {/* Main Admin Account Entry */}
                <div
                  onClick={() => {
                    if (isImpersonating) handleSwitchToAdmin();
                    else setIsOpen(false);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    !isImpersonating
                      ? 'bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200/60 dark:border-purple-800/40'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white flex-shrink-0 shadow-sm shadow-purple-500/20">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {adminAccount.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-[#7C3AED] dark:text-[#A78BFA]">
                          {translateText('Admin')}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                        {adminAccount.email || translateText('Primary Workspace Admin')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                    {!isImpersonating ? (
                      <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : switchingId === 'main' ? (
                      <Loader2 size={15} className="animate-spin text-[#7C3AED]" />
                    ) : (
                      <span className="text-[11px] font-semibold text-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <ArrowRightLeft size={12} />
                        {translateText('Switch')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-Accounts Header */}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  <span>{translateText('Sub-Accounts')}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {filteredAccounts.length}
                  </span>
                </div>

                {/* Sub-Accounts List */}
                {filteredAccounts.length === 0 ? (
                  <div className="p-5 text-center text-xs text-gray-400">
                    {searchQuery ? translateText('No sub-accounts found matching your search.') : translateText('No sub-accounts registered yet.')}
                  </div>
                ) : (
                  filteredAccounts.map(account => {
                    const isActive = isImpersonating && currentUser?.id === account.id;
                    const isBusy = switchingId === account.id;
                    const initial = (account.name || account.email || 'U').charAt(0).toUpperCase();
                    const avatarClass = getAvatarColor(account.name || account.email);

                    return (
                      <div
                        key={account.id}
                        onClick={() => handleSwitchTo(account)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar badge */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarClass}`}>
                            {initial}
                          </div>

                          {/* Account Name and Email */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                                {account.name || translateText('Unnamed Account')}
                              </span>
                              {account.status && (
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  account.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                              {account.email}
                            </span>
                          </div>
                        </div>

                        {/* Right Indicator / Action */}
                        <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                          {isActive ? (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          ) : isBusy ? (
                            <Loader2 size={15} className="animate-spin text-[#7C3AED]" />
                          ) : (
                            <span className="text-[11px] font-semibold text-[#7C3AED] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <ArrowRightLeft size={12} />
                              {translateText('Switch')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer: Quick Link to Sub-Accounts Management */}
              <div className="p-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin/users');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <Layers size={14} />
                  <span>{translateText('Manage All Sub Accounts')}</span>
                  <ExternalLink size={12} className="opacity-60" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
