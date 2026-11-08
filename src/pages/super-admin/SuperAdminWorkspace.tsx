function Badge({ value }: { value: string }) { return <span className={`saw-badge saw-${value.toLowerCase()}`}>{t(value)}</span>; }
function Stat({ label, value, note }: { label: string; value: string | number; note: string }) { return <article className="saw-stat"><span>{t(label)}</span><strong>{value}</strong><small>{t(note)}</small></article>; }
function Modal({ title, children, close }: PropsWithChildren<{ title: string; close: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; const dialog = ref.current!; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  return <dialog className="saw-modal" ref={ref} aria-label={t(title)} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="saw-modal-head"><h2>{t(title)}</h2><button type="button" aria-label={t('Close dialog')} onClick={close}><X size={20}/></button></div>{children}</dialog>;
}
type GridProps = { columns: string[]; rows: { id: string; cells: ReactNode[] }[] };
function Grid(props: GridProps) { return <DataGrid key={props.rows.map(row => row.id).join('|')} {...props}/>; }
function DataGrid({ columns, rows }: GridProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const startIdx = rows.length ? (current - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(current * pageSize, rows.length);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setSizeMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSizeMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sizeMenuOpen]);

  const visiblePageNumbers = () => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, pages];
    if (current >= pages - 2) return [1, pages - 3, pages - 2, pages - 1, pages];
    return [1, current - 1, current, current + 1, pages];
  };

  return (
    <div className="saw-grid">
      <div className="saw-table-wrap">
        <table>
          <thead>
            <tr>{columns.map(c => <th key={c}>{t(c)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * pageSize, current * pageSize).map(row => (
              <tr key={row.id}>{row.cells.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="saw-empty">
                  <Search size={24} />
                  <p>{t('No matching records. Try another search or filter.')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="saw-pagination-footer">
        <div className="saw-pagination-meta">
          <span className="saw-pagination-summary">
            {rows.length
              ? `${t('Showing')} ${startIdx}–${endIdx} ${t('of')} ${rows.length} ${t('records')}`
              : `0 ${t('records')}`}
          </span>
          <div className="saw-page-size-picker" ref={sizeMenuRef}>
            <span className="saw-page-size-label">{t('Rows per page')}</span>
            <button
              type="button"
              className={`saw-page-size-trigger${sizeMenuOpen ? ' is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={sizeMenuOpen}
              aria-label={t('Rows per page')}
              onClick={() => setSizeMenuOpen(prev => !prev)}
            >
              <strong>{pageSize}</strong>
              <ChevronDown size={14} className="saw-page-size-chevron" />
            </button>
            {sizeMenuOpen && (
              <div className="saw-page-size-menu" role="listbox" aria-label={t('Rows per page')}>
                {[5, 8, 10, 20, 50].map(size => {
                  const active = size === pageSize;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      key={size}
                      className={`saw-page-size-option${active ? ' is-selected' : ''}`}
                      onClick={() => {
                        setPageSize(size);
                        setPage(1);
                        setSizeMenuOpen(false);
                      }}
                    >
                      <span>{size} {t('rows')}</span>
                      {active && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="saw-pagination-controls">
          <button
            type="button"
            className="saw-page-btn"
            aria-label={t('Previous page')}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="saw-page-numbers">
            {visiblePageNumbers().map((num, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev !== undefined && num - prev > 1;
              return (
                <span key={num} className="saw-page-num-group">
                  {showEllipsis && <em className="saw-page-dots">…</em>}
                  <button
                    type="button"
                    className={`saw-page-num${num === current ? ' is-active' : ''}`}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            className="saw-page-btn"
            aria-label={t('Next page')}
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  );
}
function Filters({ query, setQuery, status, setStatus, options }: { query: string; setQuery: (v: string) => void; status: string; setStatus: (v: string) => void; options: string[] }) {
  return <div className="saw-filters"><label className="saw-search"><Search size={17}/><input aria-label={t('Search records')} placeholder={t('Search by name, email or ID…')} value={query} onChange={e => setQuery(e.target.value)}/></label><DashboardSelect aria-label={t('Filter by status')} value={status} onChange={e => setStatus(e.target.value)}><option value="All">{t('All statuses')}</option>{options.map(o => <option key={o} value={o}>{t(o)}</option>)}</DashboardSelect>{(query || status !== 'All') && <button onClick={() => { setQuery(''); setStatus('All'); }}>{t('Clear filters')}</button>}</div>;
}
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowLeft, Ban, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Pencil, Plus, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { BookingSelect as DashboardSelect } from '../booking/BookingSelect';
import { ManagedMetaWalletPanel } from '../settings/MetaWalletPanel';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { backendError } from '../../backend/firebase';
import { usePaymentMethods } from '../../backend/paymentMethods';
import { useTrackingConfig, validGoogle, validMeta } from '../../backend/marketingTracking';
import {
  ALL_PLATFORM_TAB_KEYS,
  defaultTabsForRole,
  isPlatformTeamRole,
  PLATFORM_SIDEBAR_TABS,
  platformTeamRoles,
  resolveAllowedTabKeys,
  type PlatformTabKey,
} from '../../router/platformAccess';
import type { PlatformTeamRole } from '../../types/auth';
import {
  isAdminAccount, isSubUser, platformTimezones, updatePlatform, usePlatformAccounts, usePlatformAudit,
  usePlatformPayments, usePlatformSettings, usePlatformSubscriptions, usePlatformUsage,
  type PlatformAccount, type PlatformPayment, type PlatformSettings,
} from '../../backend/superAdmin';
import { exportCsv } from './adminData';
import './admin-workspace.css';


function useFilters() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState('All');
  return { query, setQuery, status, setStatus, matches: (fields: string[], value: string) =>
    (status === 'All' || status === value) && fields.some(field => field.toLowerCase().includes(query.trim().toLowerCase())) };
}

type SyncPhase = 'idle' | 'syncing' | 'fading';
const SyncStatusContext = createContext<{
  phase: SyncPhase;
  reportSyncing: (active: boolean) => void;
}>({ phase: 'idle', reportSyncing: () => {} });

function LiveContent({ sources, children }: PropsWithChildren<{ sources: { loading: boolean; error: string; cached?: boolean }[] }>) {
  const error = sources.find(source => source.error)?.error;
  const retry = useContext(RetryContext);
  const { reportSyncing } = useContext(SyncStatusContext);
  const isHydrating = sources.some(source => source.loading || source.cached);

  useEffect(() => {
    reportSyncing(isHydrating);
    return () => reportSyncing(false);
  }, [isHydrating, reportSyncing]);

  if (error) return <div className="saw-warning" role="alert">{t(error)} <button onClick={retry}>{t('Try again')}</button></div>;
  if (sources.some(source => source.loading)) {
    return (
      <div className="saw-loading-shell" role="status" aria-label={t('Syncing with cloud…')}>
        <div className="saw-stats" aria-hidden="true">
          {[0, 1, 2, 3].map(idx => (
            <div className="saw-stat saw-skeleton-card animate-pulse" key={idx}>
              <div className="saw-sk-line saw-sk-sm" />
              <div className="saw-sk-line saw-sk-lg" />
              <div className="saw-sk-line saw-sk-xs" />
            </div>
          ))}
        </div>
        <div className="saw-panel saw-skeleton-table animate-pulse" aria-hidden="true">
          <div className="saw-sk-toolbar">
            <div className="saw-sk-line saw-sk-search" />
            <div className="saw-sk-line saw-sk-filter" />
          </div>
          {[0, 1, 2, 3, 4].map(idx => (
            <div className="saw-sk-row" key={idx}>
              <div className="saw-sk-avatar" />
              <div className="saw-sk-col">
                <div className="saw-sk-line saw-sk-md" />
                <div className="saw-sk-line saw-sk-xs" />
              </div>
              <div className="saw-sk-line saw-sk-pill" />
              <div className="saw-sk-line saw-sk-btn" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const RetryContext = createContext<() => void>(() => {});

function Heading({ title, description, children, platform }: PropsWithChildren<{ title: string; description: string; platform?: string }>) {
  const { phase } = useContext(SyncStatusContext);
  const tooltipText = t('Using cached offline data — sync in progress with Firebase');

  return (
    <header className="saw-heading">
      <div>
        <div className="saw-eyebrow-row">
          <span className="saw-eyebrow">
            {platform ? `${platform.toUpperCase()} / ${t('PLATFORM CONTROL')}` : t('UPCLICK / PLATFORM CONTROL')}
          </span>
          {phase !== 'idle' && (
            <div
              className={`saw-live-sync-chip${phase === 'fading' ? ' is-fading' : ''}`}
              role="status"
              aria-live="polite"
              title={tooltipText}
            >
              <span className="saw-live-sync-dot" aria-hidden="true" />
              <span className="saw-live-sync-text">
                {phase === 'fading' ? t('Live Synced') : t('Syncing with cloud…')}
              </span>
              <span className="saw-live-sync-tooltip" role="tooltip">
                {tooltipText}
              </span>
            </div>
          )}
        </div>
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </div>
      <div className="saw-actions">{children}</div>
    </header>
  );
}

const displayDate = (date: Date | null, timeZone?: string) => date ? date.toLocaleDateString(undefined, { timeZone }) : '—';
const displayMoney = (amount: number | null, currency: string) => amount === null ? '—' : currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount) : String(amount);
const teamLabel: Record<PlatformTeamRole, string> = { SUPER_ADMIN: 'Superadmin', PLATFORM_SUPPORT: 'Support', PLATFORM_FINANCE: 'Finance' };

function Person({ account }: { account: PlatformAccount }) {
  const name = account.name || account.email || account.id;
  return <div className="saw-person"><span className="saw-avatar">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><b>{name}</b><small>{account.email || account.id}</small></div></div>;
}

type AccountDialog = { kind: 'create' } | { kind: 'edit' | 'details'; id: string }
  | { kind: 'delete'; id: string } | { kind: 'status'; id: string; active: boolean };

function SubUsersPage({ adminId }: { adminId: string }) {
  const navigate = useNavigate();
  const source = usePlatformAccounts();
  const filters = useFilters();
  const parentAdmin = source.data.find(account => account.id === adminId);
  const subUsers = parentAdmin ? source.data.filter(row => isSubUser(row, parentAdmin)) : [];
  const visible = subUsers.filter(row => filters.matches([row.name, row.email, row.id], row.status));

  return (
    <>
      <Heading
        title="Sub-users"
        description={
          parentAdmin
            ? `${t('Linked workspace users and default Agency account for')} ${parentAdmin.name || parentAdmin.email || parentAdmin.id}`
            : t('Manage linked sub-users for this platform admin.')
        }
      >
        <button type="button" onClick={() => navigate('/super-admin/clients')}>
          <ArrowLeft size={16} />
          {t('Back to All Admins')}
        </button>
        <button
          disabled={source.loading || !!source.error || !visible.length}
          onClick={() =>
            exportCsv(
              `upclick-sub-users-${adminId}.csv`,
              ['ID', 'Name', 'Email', 'Account Type', 'Status'],
              visible.map(row => [row.id, row.name, row.email, row.agency ? 'Agency user' : 'User', row.status])
            )
          }
        >
          <ArrowDownToLine size={16} />
          {t('Export CSV')}
        </button>
      </Heading>

      <LiveContent sources={[source]}>
        {parentAdmin && (
          <div className="saw-panel saw-subusers-parent">
            <div className="saw-subusers-parent-main">
              <Person account={parentAdmin} />
              <Badge value={parentAdmin.status} />
            </div>
            <div className="saw-subusers-parent-meta">
              <div>
                <span>{t('Workspace')}</span>
                <b className="saw-mono">{parentAdmin.tenantId || '—'}</b>
              </div>
              <div>
                <span>{t('Joined')}</span>
                <b>{displayDate(parentAdmin.joined)}</b>
              </div>
            </div>
          </div>
        )}

        <div className="saw-stats">
          <Stat label="Linked users" value={subUsers.length} note="Total sub-users under this admin" />
          <Stat label="Active accounts" value={subUsers.filter(row => row.status === 'Active').length} note="Sub-users with active access" />
          <Stat label="Agency user" value={subUsers.filter(row => row.agency).length} note="Default agency workspace account" />
          <Stat label="Suspended accounts" value={subUsers.filter(row => row.status === 'Suspended').length} note="Sub-users with disabled access" />
        </div>

        <Filters {...filters} options={['Active', 'Suspended', 'Pending']} />

        <Grid
          columns={['User', 'Account type', 'Status', 'Joined']}
          rows={visible.map(row => ({
            id: row.id,
            cells: [
              <Person key="person" account={row} />,
              <span key="type" className={`saw-badge ${row.agency ? 'saw-trial' : ''}`}>
                {t(row.agency ? 'Agency user' : 'User')}
              </span>,
              <Badge key="status" value={row.status} />,
              displayDate(row.joined),
            ],
          }))}
        />
      </LiveContent>
    </>
  );
}

function Accounts({ team = false }: { team?: boolean }) {
  const { adminId } = useParams<{ adminId?: string }>();
  const navigate = useNavigate();
  const language = useUILanguage();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const source = usePlatformAccounts();
  const subscriptions = usePlatformSubscriptions();
  const filters = useFilters();
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState<PlatformTeamRole>('PLATFORM_SUPPORT');
  const [allowedTabs, setAllowedTabs] = useState<PlatformTabKey[]>(() => defaultTabsForRole('PLATFORM_SUPPORT'));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const requestId = useRef('');

  if (!team && adminId) {
    return <SubUsersPage adminId={adminId} />;
  }

  const rows = source.data.filter(account => team ? isPlatformTeamRole(account.role) : isAdminAccount(account));
  const visible = rows.filter(account => filters.matches([account.name, account.email, account.id], account.status));
  const selected = dialog && 'id' in dialog ? source.data.find(account => account.id === dialog.id) : undefined;
  const selectedSubscription = selected ? subscriptions.data.find(sub => sub.id === selected.id) : undefined;
  const open = (next: AccountDialog) => {
    setError(''); setNotice('');
    setShowPassword(false); setShowConfirmPassword(false);
    if (next.kind === 'edit') {
      const target = source.data.find(account => account.id === next.id);
      if (target && isPlatformTeamRole(target.role)) {
        const initialTabs = resolveAllowedTabKeys(target.role, target.allowedTabs);
        setRole(target.role);
        setAllowedTabs(initialTabs);
      }
    } else {
      const defaultRole: PlatformTeamRole = 'PLATFORM_SUPPORT';
      setRole(defaultRole);
      setAllowedTabs(defaultTabsForRole(defaultRole));
    }
    if (next.kind === 'create') requestId.current = crypto.randomUUID();
    setDialog(next);
  };
  const handleRoleChange = (value: string) => {
    if (isPlatformTeamRole(value)) {
      setRole(value);
      setAllowedTabs(defaultTabsForRole(value));
    }
  };
  const toggleAllowedTab = (tabKey: PlatformTabKey) => {
    const nextTabs = allowedTabs.includes(tabKey)
      ? allowedTabs.filter(item => item !== tabKey)
      : [...allowedTabs, tabKey];
    const ordered = ALL_PLATFORM_TAB_KEYS.filter(item => nextTabs.includes(item));
    setAllowedTabs(ordered);
  };
  const selectAllTabs = () => {
    setAllowedTabs([...ALL_PLATFORM_TAB_KEYS]);
  };
  const clearAllTabs = () => {
    setAllowedTabs([]);
  };
  const close = () => { if (!busy) setDialog(null); };
  const save = async (input: Parameters<typeof updatePlatform>[0], success: string) => {
    setBusy(true); setError('');
    try { await updatePlatform(input); setNotice(success); setDialog(null); }
    catch (failure) { setError(backendError(failure)); }
    finally { setBusy(false); }
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dialog) return;
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name') ?? '').trim(), email = String(fields.get('email') ?? '').trim();
    if (!name) { setError('Enter a valid name.'); return; }
    if (team && !allowedTabs.length) { setError('Select at least one permitted sidebar tab.'); return; }
    if (dialog.kind === 'edit' && selected) {
      if (team) {
        void save({ operation: 'editAdmin', id: selected.id, name, email, role, allowedTabs }, 'Team member permissions saved.');
      } else {
        void save({ operation: 'editAdmin', id: selected.id, name, email }, 'Admin details saved.');
      }
      return;
    }
    const password = String(fields.get('password') ?? '');
    if (password !== fields.get('confirmPassword')) { setError('Passwords must match.'); return; }
    const credentials = { name, email, password, requestId: requestId.current, language };
    if (team) void save({ operation: 'createMember', role, allowedTabs, ...credentials }, 'Team member created.');
    else void save({ operation: 'createAdmin', ...credentials }, 'Admin and default Agency user created.');
  }
  return <>
    <Heading title={team ? 'Team Management' : 'All Admins'} description={team ? 'Give your team the access they need to do their best work.' : 'Manage platform admins and their linked users.'}>
      {!team && <button disabled={source.loading || !!source.error || !visible.length} onClick={() => exportCsv('upclick-admins.csv', ['ID', 'Name', 'Email', 'Status'], visible.map(row => [row.id, row.name, row.email, row.status]))}><ArrowDownToLine size={16}/>{t('Export CSV')}</button>}
      <button className="saw-primary" disabled={source.loading || !!source.error || source.cached} onClick={() => open({ kind: 'create' })}><Plus size={16}/>{t(team ? 'Add team member' : 'Add admin')}</button>
    </Heading>
    {notice && <div className="saw-notice" role="status"><Check size={16}/>{t(notice)}<button aria-label={t('Dismiss notification')} onClick={() => setNotice('')}><X size={16}/></button></div>}
    <LiveContent sources={[source]}>
      {team ? <div className="saw-panel saw-permissions"><ShieldCheck size={22}/><div><h2>{t('Access with intention')}</h2><p>{t('Superadmin has full access. Support can open Support and Logs. Finance can open Payments, Usage & Revenue, and Wallet.')}</p></div></div>
        : <div className="saw-stats"><Stat label="Total admins" value={rows.length} note="Platform admin accounts"/><Stat label="Active accounts" value={rows.filter(row => row.status === 'Active').length} note="Admins with access"/><Stat label="Suspended accounts" value={rows.filter(row => row.status === 'Suspended').length} note="Admins with disabled access"/><Stat label="Pending accounts" value={rows.filter(row => row.status === 'Pending').length} note="Awaiting activation"/></div>}
      <Filters {...filters} options={team ? ['Active', 'Suspended'] : ['Active', 'Suspended', 'Pending']}/>
      <Grid
        columns={team ? ['Member', 'Role', 'Status', 'Actions'] : ['Admin', 'Status', 'Actions']}
        rows={visible.map(account => {
          const memberRole = isPlatformTeamRole(account.role) ? account.role : null;
          const memberTabs = memberRole ? resolveAllowedTabKeys(memberRole, account.allowedTabs) : [];
          return {
            id: account.id,
            cells: [
              <Person key="person" account={account}/>,
              ...(team ? [
                <div key="role" className="saw-role-cell">
                  <strong>
                    {memberRole ? t(teamLabel[memberRole]) : account.id}
                  </strong>
                  {memberRole && (
                    <small className="saw-role-tabs-summary">
                      {memberTabs.length === PLATFORM_SIDEBAR_TABS.length
                        ? t('All sidebar tabs permitted')
                        : `${memberTabs.length} / ${PLATFORM_SIDEBAR_TABS.length} ${t('permitted tabs')}`}
                    </small>
                  )}
                </div>,
              ] : []),
              <Badge key="status" value={account.status}/>,
              <div key="actions" className="saw-actions saw-row-actions">
                {!team && (
                  <>
                    <button type="button" className="saw-action-btn" onClick={() => open({ kind: 'details', id: account.id })}>
                      <Eye size={13}/>
                      {t('View details')}
                    </button>
                    <button
                      type="button"
                      className="saw-action-btn"
                      onClick={() => navigate(`/super-admin/clients/${encodeURIComponent(account.id)}/sub-users`)}
                    >
                      <Users size={13}/>
                      {t('View sub-users')}
                    </button>
                  </>
                )}
                {(!team || account.id !== currentUserId) && (
                  <button type="button" className="saw-action-btn" disabled={source.cached} onClick={() => open({ kind: 'edit', id: account.id })}>
                    <Pencil size={13}/>
                    {t('Edit')}
                  </button>
                )}
                {account.role !== 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    className={`saw-action-btn ${account.status === 'Active' ? 'saw-btn-warn' : 'saw-btn-success'}`}
                    disabled={source.cached}
                    onClick={() => open({ kind: 'status', id: account.id, active: account.status !== 'Active' })}
                  >
                    {account.status === 'Active' ? <Ban size={13}/> : <CheckCircle2 size={13}/>}
                    {t(account.status === 'Active' ? 'Suspend' : 'Activate')}
                  </button>
                )}
                {(!team || (account.role !== 'SUPER_ADMIN' && account.id !== currentUserId)) && (
                  <button
                    type="button"
                    className="saw-action-btn saw-btn-danger"
                    disabled={source.cached}
                    onClick={() => open({ kind: 'delete', id: account.id })}
                  >
                    <Trash2 size={13}/>
                    {t('Delete')}
                  </button>
                )}
              </div>,
            ],
          };
        })}
      />
    </LiveContent>
    {(dialog?.kind === 'create' || dialog?.kind === 'edit' && selected) && <Modal title={dialog.kind === 'edit' ? (team ? 'Edit team member' : 'Edit admin') : team ? 'Add team member' : 'Add admin'} close={close}>
      <form className="saw-modal-form" onSubmit={submit}>
        <label>
          {t('Name')}
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={selected?.name}
            placeholder={t(team ? 'e.g. Sarah Jenkins — Platform Support' : 'e.g. Alex Morgan — Agency Owner')}
            autoFocus
            disabled={busy}
          />
        </label>
        <label>
          {t('Email')}
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            defaultValue={selected?.email}
            placeholder={t(team ? 'member@upclick.app' : 'admin@company.com')}
            disabled={busy}
          />
        </label>
        {dialog.kind === 'create' && <>
          <label>
            {t('Password')}
            <div className="saw-password-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('Enter strong password (min. 8 characters)')}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                disabled={busy}
              />
              <button
                type="button"
                className="saw-password-eye"
                aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                onClick={() => setShowPassword(prev => !prev)}
                disabled={busy}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label>
            {t('Confirm Password')}
            <div className="saw-password-wrap">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('Re-enter password to confirm')}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                disabled={busy}
              />
              <button
                type="button"
                className="saw-password-eye"
                aria-label={t(showConfirmPassword ? 'Hide password' : 'Show password')}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                disabled={busy}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {!team && <p>{t('The admin can open the default Agency workspace from the account switcher. Both use the admin’s credit and wallet balances.')}</p>}
        </>}
        {team && (
          <>
            <label>
              {t('Role')}
              <DashboardSelect
                value={role}
                onChange={event => handleRoleChange(event.target.value)}
                disabled={busy}
              >
                {platformTeamRoles.map(value => (
                  <option key={value} value={value}>{t(teamLabel[value])}</option>
                ))}
              </DashboardSelect>
            </label>
            <div className="saw-permissions-box" role="group" aria-label={t('Permitted Sidebar Tabs')}>
              <div className="saw-permissions-head">
                <div className="saw-permissions-title">
                  <span>{t('Permitted Sidebar Tabs')}</span>
                  <small className="saw-permissions-count">
                    {allowedTabs.length} / {PLATFORM_SIDEBAR_TABS.length}
                  </small>
                </div>
                <div className="saw-permissions-actions">
                  <button
                    type="button"
                    className="saw-perm-quick-btn"
                    onClick={selectAllTabs}
                    disabled={busy || allowedTabs.length === PLATFORM_SIDEBAR_TABS.length}
                  >
                    {t('Select All')}
                  </button>
                  <button
                    type="button"
                    className="saw-perm-quick-btn"
                    onClick={clearAllTabs}
                    disabled={busy || allowedTabs.length === 0}
                  >
                    {t('Clear All')}
                  </button>
                </div>
              </div>
              <div className="saw-permissions-grid">
                {PLATFORM_SIDEBAR_TABS.map(tab => {
                  const checked = allowedTabs.includes(tab.key);
                  return (
                    <label
                      key={tab.key}
                      className={`saw-perm-item${checked ? ' is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAllowedTab(tab.key)}
                        disabled={busy}
                      />
                      <span className="saw-perm-check" aria-hidden="true">
                        {checked && <Check size={12} />}
                      </span>
                      <span className="saw-perm-label">
                        {language === 'ar' ? tab.ar : t(tab.label)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {error && <p role="alert" className="saw-warning">{t(error)}</p>}
        <button className="saw-primary" disabled={busy || source.cached} type="submit">{t(busy ? 'Saving…' : dialog.kind === 'edit' ? 'Save changes' : team ? 'Create team member' : 'Create admin')}</button>
      </form>
    </Modal>}
    {dialog?.kind === 'details' && selected && (
      <Modal title="Admin details" close={close}>
        <div className="saw-detail saw-detail-pro">
          <div className="saw-detail-profile">
            <Person account={selected} />
            <Badge value={selected.status} />
          </div>

          <div className="saw-plan-card">
            <div className="saw-plan-card-head">
              <div className="saw-plan-title-wrap">
                <span className="saw-plan-icon">
                  <CreditCard size={18} />
                </span>
                <div>
                  <span className="saw-plan-eyebrow">{t('CURRENT SUBSCRIPTION PLAN')}</span>
                  <strong>
                    {selectedSubscription?.plan
                      ? (language === 'ar' ? selectedSubscription.planAr || selectedSubscription.plan : selectedSubscription.plan)
                      : t('No active plan')}
                  </strong>
                </div>
              </div>
              {selectedSubscription?.status ? (
                <Badge value={selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)} />
              ) : (
                <span className="saw-badge">{t('Unsubscribed')}</span>
              )}
            </div>
            <div className="saw-plan-meta">
              <div>
                <span>{t('Plan Rate')}</span>
                <b>
                  {selectedSubscription?.price !== null && selectedSubscription?.price !== undefined
                    ? displayMoney(selectedSubscription.price, selectedSubscription.currency || 'USD')
                    : '—'}
                </b>
              </div>
              <div>
                <span>{t('Renewal / Expiry')}</span>
                <b>{displayDate(selectedSubscription?.expires ?? null)}</b>
              </div>
            </div>
          </div>

          <dl className="saw-detail-grid">
            <div>
              <dt>{t('Account ID')}</dt>
              <dd className="saw-mono break-all">{selected.id}</dd>
            </div>
            <div>
              <dt>{t('Workspace')}</dt>
              <dd className="saw-mono break-all">{selected.tenantId || '—'}</dd>
            </div>
            <div>
              <dt>{t('Joined')}</dt>
              <dd>{displayDate(selected.joined)}</dd>
            </div>
            <div>
              <dt>{t('Linked users')}</dt>
              <dd>{source.data.filter(row => isSubUser(row, selected)).length}</dd>
            </div>
          </dl>
        </div>
      </Modal>
    )}
    {(dialog?.kind === 'delete' || dialog?.kind === 'status') && selected && (
      <Modal
        title={dialog.kind === 'delete' ? (team ? 'Delete team member' : 'Delete admin') : dialog.active ? 'Activate account' : 'Suspend account'}
        close={close}
      >
        <div className="saw-confirm-dialog">
          <div className="saw-confirm-target">
            <div
              className={`saw-confirm-icon ${
                dialog.kind === 'delete' ? 'is-danger' : dialog.active ? 'is-success' : 'is-warn'
              }`}
            >
              {dialog.kind === 'delete' ? (
                <Trash2 size={20} />
              ) : dialog.active ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div className="saw-confirm-account">
              <Person account={selected} />
              <Badge value={selected.status} />
            </div>
          </div>

          <div
            className={`saw-confirm-callout ${
              dialog.kind === 'delete' ? 'is-danger' : dialog.active ? 'is-success' : 'is-warn'
            }`}
          >
            {dialog.kind === 'delete' ? (
              <p>
                {t(
                  team
                    ? 'This team member will be permanently removed and their sign-in access to the platform control center will be revoked immediately.'
                    : 'The admin and default Agency sign-in will be deleted. Billing history and workspace records are retained.'
                )}
              </p>
            ) : dialog.active ? (
              <p>
                {t(
                  team
                    ? 'Activating this account immediately restores sign-in and permitted sidebar access for this team member.'
                    : 'Activating this account immediately restores sign-in and workspace access for this admin and their linked sub-users.'
                )}
              </p>
            ) : (
              <p>
                {t(
                  team
                    ? 'Suspending this account immediately revokes sign-in access for this team member until reactivated.'
                    : 'Suspending this account immediately revokes sign-in access for this admin and pauses their workspace operations until reactivated.'
                )}
              </p>
            )}
          </div>

          {error && <p role="alert" className="saw-warning">{t(error)}</p>}

          <div className="saw-confirm-footer">
            <button type="button" disabled={busy} onClick={close}>
              {t('Cancel')}
            </button>
            <button
              type="button"
              className={
                dialog.kind === 'delete'
                  ? 'saw-danger-solid'
                  : dialog.active
                  ? 'saw-primary'
                  : 'saw-warn-solid'
              }
              disabled={busy || source.cached}
              onClick={() => {
                if (dialog.kind === 'delete') {
                  void save(
                    { operation: 'deleteAdmin', id: selected.id, ...(team ? { teamMember: true } : {}) },
                    team ? 'Team member deleted.' : 'Admin deleted.'
                  );
                } else {
                  void save({ operation: 'setStatus', id: selected.id, active: dialog.active }, 'Account status updated.');
                }
              }}
            >
              {dialog.kind === 'delete' ? (
                <Trash2 size={15} />
              ) : dialog.active ? (
                <CheckCircle2 size={15} />
              ) : (
                <Ban size={15} />
              )}
              {t(
                busy
                  ? 'Saving…'
                  : dialog.kind === 'delete'
                  ? team
                    ? 'Delete team member'
                    : 'Delete admin'
                  : dialog.active
                  ? 'Activate account'
                  : 'Suspend account'
              )}
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>;
}

function totals(payments: PlatformPayment[]) {
  const amounts = new Map<string, number>();
  for (const row of payments) {
    if (row.amount === null || !row.currency) continue;
    amounts.set(row.currency, (amounts.get(row.currency) ?? 0) + row.amount);
  }
  return [...amounts].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => displayMoney(amount, currency)).join(' · ') || '—';
}

function Growth({ payments, months }: { payments: PlatformPayment[]; months: number }) {
  const currencies = [...new Set(payments.map(row => row.currency).filter(Boolean))].sort();
  const [selectedCurrency, setCurrency] = useState('');
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] ?? '';
  const today = new Date();
  const periods = Array.from({ length: months }, (_, i) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months + i + 1, 1));
    const key = date.toISOString().slice(0, 7);
    const value = payments.filter(row => row.currency === currency && row.date?.toISOString().startsWith(key)).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    return { key, label: date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), value };
  });
  const max = Math.max(1, ...periods.map(row => row.value));
  return <section className="saw-panel"><div className="saw-section-head"><div><h2>{t('Revenue growth')}</h2><p>{t('Manually approved platform sales by month')}</p></div>
    {currencies.length > 1 && <DashboardSelect aria-label={t('Revenue currency')} value={currency} onChange={event => setCurrency(event.target.value)}>{currencies.map(value => <option key={value}>{value}</option>)}</DashboardSelect>}
  </div>{currency ? <div className="saw-chart" role="img" aria-label={periods.map(row => `${row.label} ${displayMoney(row.value, currency)}`).join(', ')}>
    {periods.map(row => <div className="saw-bar-column" key={row.key}><span>{displayMoney(row.value, currency)}</span><div className="saw-bar-track"><div style={{ height: `${Math.max(0, row.value) / max * 100}%`, minHeight: row.value > 0 ? 6 : 0 }}/></div><small>{row.label}</small></div>)}
  </div> : <p className="saw-empty">{t('No approved platform sales recorded.')}</p>}</section>;
}

function Period({ months, setMonths }: { months: number; setMonths: (value: number) => void }) {
  return <div className="saw-section-head"><h2>{t('Performance snapshot')}</h2><DashboardSelect aria-label={t('Analytics period')} value={months} onChange={event => setMonths(Number(event.target.value))}><option value={6}>{t('Last 6 months')}</option><option value={3}>{t('Last 3 months')}</option></DashboardSelect></div>;
}

function Overview() {
  const accounts = usePlatformAccounts(), subscriptions = usePlatformSubscriptions(), payments = usePlatformPayments(false), settings = usePlatformSettings();
  const [months, setMonths] = useState(6);
  const admins = accounts.data.filter(isAdminAccount);
  const active = admins.filter(row => row.status === 'Active').length;
  const livePlans = subscriptions.data.filter(row => ['active', 'trialing'].includes(row.status) && (!row.expires || row.expires.getTime() > Date.now()));
  const planCounts = new Map<string, number>();
  for (const subscription of livePlans) {
    const label = subscription.plan || t('Unspecified plan');
    planCounts.set(label, (planCounts.get(label) ?? 0) + 1);
  }
  const revenue = payments.data.filter(row => row.platformRevenue);
  return <>
    <Heading title="Platform overview" description="Monitor platform accounts, subscriptions and revenue." platform={settings.data.settings.name}/>
    <LiveContent sources={[accounts, subscriptions, payments, settings]}>
      {settings.data.settings.maintenance && <div className="saw-warning" role="status">{t('A maintenance window is recorded in System Settings.')}</div>}
      <div className="saw-stats"><Stat label="Total admins" value={admins.length} note="Platform admin accounts"/><Stat label="Active admins" value={active} note="Admins with access"/><Stat label="Platform revenue" value={totals(revenue)} note="Manually approved plans and add-ons"/><Stat label="Active subscriptions" value={livePlans.length} note="Current plans and trials"/></div>
      <Period months={months} setMonths={setMonths}/>
      <div className="saw-two-column"><Growth payments={revenue} months={months}/><section className="saw-panel"><h2>{t('Plan adoption')}</h2><p>{t('Active subscriptions by plan')}</p>
        {!planCounts.size && <p className="saw-empty">{t('No active subscriptions.')}</p>}
        {[...planCounts].sort(([, a], [, b]) => b - a).map(([plan, count]) => <div className="saw-adoption" key={plan}><div><span>{plan}</span><b>{count}</b></div><progress aria-label={plan} max={livePlans.length} value={count}/></div>)}
      </section></div>
      <section><div className="saw-section-head"><h2>{t('Recent admins')}</h2><Link to="/super-admin/clients">{t('View all admins')} ↗</Link></div><Grid columns={['Admin', 'Account ID', 'Status', 'Joined']} rows={admins.slice(0, 5).map(row => ({ id: row.id, cells: [<Person key="person" account={row}/>, row.id, <Badge key="status" value={row.status}/>, displayDate(row.joined, settings.data.settings.timezone)] }))}/></section>
    </LiveContent>
  </>;
}

function Analytics() {
  const payments = usePlatformPayments(true), usage = usePlatformUsage();
  const [months, setMonths] = useState(6);
  const revenue = payments.data.filter(row => row.platformRevenue);
  const credits = usage.data.reduce((sum, row) => sum + row.amount, 0);
  const byService = new Map<string, number>();
  for (const row of usage.data) {
    const service = row.description || t('General usage');
    byService.set(service, (byService.get(service) ?? 0) + row.amount);
  }
  return <>
    <Heading title="Usage & Revenue" description="Track recorded credit consumption and billing activity."/>
    <LiveContent sources={[payments, usage]}>
      <div className="saw-stats"><Stat label="Credits consumed" value={credits.toLocaleString()} note="Recorded credit ledger usage"/><Stat label="Platform revenue" value={totals(revenue)} note="Manually approved plans and add-ons"/><Stat label="Active transactions" value={payments.data.filter(row => row.status === 'Pending' || row.status === 'Unverified').length} note="Awaiting payment or review"/></div>
      <Period months={months} setMonths={setMonths}/>
      <div className="saw-two-column"><Growth payments={revenue} months={months}/><section className="saw-panel"><h2>{t('Resource consumption')}</h2><p>{t('Credits consumed by activity')}</p>
        {!byService.size && <p className="saw-empty">{t('No credit usage recorded.')}</p>}
        {[...byService].sort(([, a], [, b]) => b - a).slice(0, 8).map(([service, count]) => <div className="saw-adoption" key={service}><div><span>{service}</span><b>{count.toLocaleString()}</b></div><progress aria-label={service} max={Math.max(1, credits)} value={count}/></div>)}
      </section></div>
    </LiveContent>
  </>;
}

function Wallet() {
  return <>
    <Heading title="Meta Advertising & API Wallet" description="Review Meta messaging and advertising connections."/>
    <ManagedMetaWalletPanel/>
  </>;
}

function Payments() {
  const source = usePlatformPayments(true);
  const filters = useFilters();
  const [details, setDetails] = useState('');
  const visible = source.data.filter(row => filters.matches([row.id, row.name, row.method, row.scope], row.status));
  const payment = source.data.find(row => row.key === details);
  return <>
    <Heading title="Payments" description="Track billing requests, invoices and gateway transactions across the platform.">
      <Link className="saw-primary" to="/super-admin/payment-methods"><CreditCard size={16}/>{t('Payment Methods')}</Link>
      <button disabled={source.loading || !!source.error || !visible.length} onClick={() => exportCsv('upclick-payments.csv', ['Invoice', 'Account', 'Source', 'Method', 'Date', 'Amount', 'Currency', 'Status'], visible.map(row => [row.id, row.name, row.scope, row.method, row.date?.toISOString() ?? '', row.amount ?? '', row.currency, row.status]))}><ArrowDownToLine size={16}/>{t('Export CSV')}</button>
    </Heading>
    <LiveContent sources={[source]}>
      <div className="saw-stats"><Stat label="Paid" value={totals(source.data.filter(row => row.status === 'Paid'))} note="Recorded commerce payments"/><Stat label="Pending" value={source.data.filter(row => row.status === 'Pending').length} note="Awaiting payment or review"/><Stat label="Failed" value={source.data.filter(row => row.status === 'Failed').length} note="Reported transaction failures"/><Stat label="Refunded" value={source.data.filter(row => row.status === 'Refunded' || row.status === 'Partially refunded').length} note="Full and partial refunds"/></div>
      <Filters {...filters} options={['Paid', 'Pending', 'Failed', 'Refunded', 'Partially refunded', 'Approved', 'Unverified', 'Rejected', 'Cancelled', 'Unknown']}/>
      <Grid columns={['Invoice', 'Account', 'Date', 'Amount', 'Status', 'Actions']} rows={visible.map(row => ({ id: row.key, cells: [<div key="id"><b>{row.id}</b><small>{t(row.scope)}{row.method && ` · ${row.method}`}</small></div>, row.name || '—', displayDate(row.date), displayMoney(row.amount, row.currency), <Badge key="status" value={row.status}/>, <button key="details" onClick={() => setDetails(row.key)}>{t('View details')}</button>] }))}/>
    </LiveContent>
    {payment && <Modal title="Payment details" close={() => setDetails('')}><div className="saw-detail"><h3>{payment.id}</h3><p>{payment.name || '—'}</p><Badge value={payment.status}/><dl>
      <div><dt>{t('Source')}</dt><dd>{t(payment.scope)}</dd></div><div><dt>{t('Payment method')}</dt><dd>{payment.method || '—'}</dd></div><div><dt>{t('Amount')}</dt><dd>{displayMoney(payment.amount, payment.currency)}</dd></div><div><dt>{t('Date')}</dt><dd>{displayDate(payment.date)}</dd></div>
    </dl></div></Modal>}
  </>;
}

const policies = [
  { key: 'registrations', label: 'Allow new registrations', help: 'Record the platform registration policy.' },
  { key: 'maintenance', label: 'Maintenance mode', help: 'Show a maintenance notice in the platform overview.' },
  { key: 'mfa', label: 'Require team two-factor authentication', help: 'Record the team authentication policy.' },
  { key: 'alerts', label: 'Operational email alerts', help: 'Record the alerting preference for the operations email.' },
] as const;

function Settings() {
  const source = usePlatformSettings();
  const [draft, setDraft] = useState<{ settings: PlatformSettings; revision: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { settings, revision } = draft ?? source.data;
  const edit = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setDraft({ settings: { ...settings, [key]: value }, revision }); setNotice('');
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !draft) return;
    setBusy(true); setError(''); setNotice('');
    try { await updatePlatform({ operation: 'saveSettings', settings, revision }); setDraft(null); setNotice('Platform settings saved.'); }
    catch (failure) { setError(backendError(failure)); }
    finally { setBusy(false); }
  }
  return <>
    <Heading title="System Settings" description="Manage global platform preferences, security and operational policies."/>
    <LiveContent sources={[source]}>
      {notice && <div className="saw-notice" role="status"><Check size={16}/>{t(notice)}</div>}
      {error && <div className="saw-warning" role="alert">{t(error)}</div>}
      <form className="saw-settings" onSubmit={save}>
        <section className="saw-panel"><h2>{t('General configuration')}</h2><p>{t('Platform identity and default account preferences.')}</p>
          <div className="saw-form-grid">
            <label>{t('Platform name')}<input required maxLength={60} value={settings.name} onChange={event => edit('name', event.target.value)} disabled={busy}/></label>
            <label>{t('Operations email')}<input required type="email" maxLength={160} value={settings.email} onChange={event => edit('email', event.target.value)} disabled={busy}/></label>
            <label>{t('Default timezone')}<DashboardSelect value={settings.timezone} onChange={event => edit('timezone', event.target.value)} disabled={busy}>{platformTimezones.map(zone => <option key={zone}>{zone}</option>)}</DashboardSelect></label>
            <label>{t('Trial duration (days)')}<input type="number" required min={1} max={90} value={settings.trialDays || ''} onChange={event => edit('trialDays', Number(event.target.value))} disabled={busy}/></label>
          </div>
        </section>
        <section className="saw-panel"><h2>{t('Security & operations')}</h2>{policies.map(item => <label className="saw-switch-row" key={item.key}><span><b>{t(item.label)}</b><small>{t(item.help)}</small></span><input type="checkbox" role="switch" checked={settings[item.key]} onChange={event => edit(item.key, event.target.checked)} disabled={busy}/></label>)}</section>
        <div className="saw-actions"><button type="button" disabled={busy || !draft} onClick={() => { setDraft(null); setError(''); setNotice('Unsaved changes discarded.'); }}>{t('Discard changes')}</button><button className="saw-primary" type="submit" disabled={busy || !draft || source.cached}>{t(busy ? 'Saving…' : 'Save changes')}</button></div>
      </form>
    </LiveContent>
  </>;
}

function Integrations() {
  const gateways = usePaymentMethods({ scope: 'super_admin' }), tracking = useTrackingConfig(true);
  const stripe = gateways.methods.find(row => row.provider === 'stripe' && row.enabled);
  const gatewayStatus = stripe?.status ?? 'Disconnected';
  const others = gateways.methods.filter(row => row.type === 'gateway' && row.provider !== 'stripe' && row.enabled);
  const trackingStatus = (valid: boolean) => valid ? (tracking.config.enabled ? 'Enabled' : 'Configured') : 'Disconnected';
  const cards = [
    { name: 'Stripe', description: 'Payment gateway credentials and checkout settings', status: gatewayStatus, to: '/super-admin/payment-methods' },
    { name: 'Payment gateways', description: 'Configure additional providers and manual payment methods', status: others.some(row => row.status === 'Connected') ? 'Connected' : others.length ? 'Configured' : 'Disconnected', to: '/super-admin/payment-methods' },
    { name: 'Meta Pixel', description: 'Platform-wide Meta event tracking', status: trackingStatus(validMeta(tracking.config.metaId)), to: '/super-admin/marketing-tracking' },
    { name: 'Google Analytics', description: 'Platform-wide GA4 measurement settings', status: trackingStatus(validGoogle(tracking.config.googleId)), to: '/super-admin/marketing-tracking' },
  ];
  return <>
    <Heading title="Integrations" description="Manage the platform’s payment gateways and analytics integrations."/>
    <LiveContent sources={[gateways, tracking]}><div className="saw-product-grid">{cards.map(integration => <section className="saw-panel" key={integration.name}>
      <div className="saw-section-head"><span className="saw-product-icon">{integration.name[0]}</span><Badge value={integration.status}/></div>
      <h2>{integration.name}</h2><p>{t(integration.description)}</p><div className="saw-actions"><Link to={integration.to}>{t('Configure integration')} ↗</Link></div>
    </section>)}</div></LiveContent>
  </>;
}

function Logs() {
  const source = usePlatformAudit();
  const filters = useFilters();
  const visible = source.data.filter(row => filters.matches([row.action, row.actor, row.target, row.id], row.severity));
  return <>
    <Heading title="Logs & Monitoring" description="Follow recorded administrative and operational events.">
      <button disabled={source.loading || !!source.error || !visible.length} onClick={() => exportCsv('upclick-audit.csv', ['Time', 'Actor', 'Action', 'Target', 'Severity'], visible.map(row => [row.time?.toISOString() ?? '', row.actor, row.action, row.target, row.severity]))}><ArrowDownToLine size={16}/>{t('Export CSV')}</button>
    </Heading>
    <LiveContent sources={[source]}>
      <div className="saw-stats"><Stat label="Audit feed" value={t(source.cached ? 'Cached' : 'Live')} note="Firebase event stream"/><Stat label="Recorded events" value={source.data.length} note="Latest 500 events"/><Stat label="Warnings" value={source.data.filter(row => row.severity === 'Warning').length} note="In loaded audit history"/><Stat label="Errors" value={source.data.filter(row => row.severity === 'Error').length} note="In loaded audit history"/></div>
      <div className="saw-section-head"><h2>{t('Audit trail')}</h2><span>{t('Latest 500 events')}</span></div>
      <Filters {...filters} options={['Info', 'Warning', 'Error']}/>
      <Grid columns={['Timestamp', 'Actor', 'Event', 'Severity']} rows={visible.map(row => ({ id: row.id, cells: [row.time?.toLocaleString() ?? '—', row.actor, <div key="event"><b>{row.action || '—'}</b><small>{row.target}</small></div>, <Badge key="severity" value={row.severity}/>] }))}/>
    </LiveContent>
  </>;
}

const screens: Record<string, () => ReactNode> = {
  overview: Overview,
  clients: () => <Accounts/>,
  users: () => <Accounts team/>,
  analytics: Analytics,
  wallet: Wallet,
  payments: Payments,
  integrations: Integrations,
  logs: Logs,
  settings: Settings,
};

export function SuperAdminWorkspace() {
  useUILanguage();
  const uid = useSelector((state: RootState) => state.auth.user?.id);
  const { pathname, search } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const wasSyncingRef = useRef(false);

  const reportSyncing = useCallback((active: boolean) => {
    if (active) {
      wasSyncingRef.current = true;
      setSyncPhase('syncing');
    } else if (wasSyncingRef.current) {
      wasSyncingRef.current = false;
      setSyncPhase('fading');
    }
  }, []);

  useEffect(() => {
    if (syncPhase !== 'fading') return;
    const timer = window.setTimeout(() => setSyncPhase('idle'), 950);
    return () => window.clearTimeout(timer);
  }, [syncPhase]);

  const Screen = screens[pathname.split('/')[2] || 'overview'] ?? Overview;
  return (
    <RetryContext.Provider value={() => setAttempt(value => value + 1)}>
      <SyncStatusContext.Provider value={{ phase: syncPhase, reportSyncing }}>
        <div className="saw-workspace">
          <Screen key={`${uid}:${pathname}:${search}:${attempt}`} />
        </div>
      </SyncStatusContext.Provider>
    </RetryContext.Provider>
  );
}
