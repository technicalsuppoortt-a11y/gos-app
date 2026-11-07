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
  const pages = Math.max(1, Math.ceil(rows.length / 8)), current = Math.min(page, pages);
  return <div className="saw-grid"><div className="saw-table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{t(c)}</th>)}</tr></thead><tbody>{rows.slice((current - 1) * 8, current * 8).map(row => <tr key={row.id}>{row.cells.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={columns.length} className="saw-empty"><Search size={24}/><p>{t('No matching records. Try another search or filter.')}</p></td></tr>}</tbody></table></div><footer><span>{rows.length} {t('records')} · {t('Page')} {current} / {pages}</span><div><button aria-label={t('Previous page')} disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={16}/></button><button aria-label={t('Next page')} disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={16}/></button></div></footer></div>;
}
function Filters({ query, setQuery, status, setStatus, options }: { query: string; setQuery: (v: string) => void; status: string; setStatus: (v: string) => void; options: string[] }) {
  return <div className="saw-filters"><label className="saw-search"><Search size={17}/><input aria-label={t('Search records')} placeholder={t('Search by name, email or ID…')} value={query} onChange={e => setQuery(e.target.value)}/></label><DashboardSelect aria-label={t('Filter by status')} value={status} onChange={e => setStatus(e.target.value)}><option value="All">{t('All statuses')}</option>{options.map(o => <option key={o} value={o}>{t(o)}</option>)}</DashboardSelect>{(query || status !== 'All') && <button onClick={() => { setQuery(''); setStatus('All'); }}>{t('Clear filters')}</button>}</div>;
}
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { BookingSelect as DashboardSelect } from '../booking/BookingSelect';
import { translateText as t, useUILanguage } from '../../i18n/display';
import { backendError } from '../../backend/firebase';
import { usePaymentMethods } from '../../backend/paymentMethods';
import { useTrackingConfig, validGoogle, validMeta } from '../../backend/marketingTracking';
import { isPlatformTeamRole, platformTeamRoles } from '../../router/platformAccess';
import type { PlatformTeamRole } from '../../types/auth';
import {
  isAdminAccount, isSubUser, platformTimezones, updatePlatform, useManagedWallets, usePlatformAccounts, usePlatformAudit,
  usePlatformPayments, usePlatformSettings, usePlatformSubscriptions, usePlatformUsage, usePlatformWallet,
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

function LiveContent({ sources, children }: PropsWithChildren<{ sources: { loading: boolean; error: string; cached?: boolean }[] }>) {
  const error = sources.find(source => source.error)?.error;
  const retry = useContext(RetryContext);
  if (error) return <div className="saw-warning" role="alert">{t(error)} <button onClick={retry}>{t('Try again')}</button></div>;
  if (sources.some(source => source.loading)) return <div className="saw-panel" role="status">{t('Loading Firebase data…')}</div>;
  return <>{sources.some(source => source.cached) && <div className="saw-warning" role="status">{t('Showing cached data while connecting to Firebase.')}</div>}{children}</>;
}

const RetryContext = createContext<() => void>(() => {});

function Heading({ title, description, children, platform }: PropsWithChildren<{ title: string; description: string; platform?: string }>) {
  return <header className="saw-heading"><div><span className="saw-eyebrow">{platform ? `${platform.toUpperCase()} / ${t('PLATFORM CONTROL')}` : t('UPCLICK / PLATFORM CONTROL')}</span><h1>{t(title)}</h1><p>{t(description)}</p></div><div className="saw-actions">{children}</div></header>;
}

const displayDate = (date: Date | null, timeZone?: string) => date ? date.toLocaleDateString(undefined, { timeZone }) : '—';
const displayMoney = (amount: number | null, currency: string) => amount === null ? '—' : currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount) : String(amount);
const teamLabel: Record<PlatformTeamRole, string> = { SUPER_ADMIN: 'Superadmin', PLATFORM_SUPPORT: 'Support', PLATFORM_FINANCE: 'Finance' };

function Person({ account }: { account: PlatformAccount }) {
  const name = account.name || account.email || account.id;
  return <div className="saw-person"><span className="saw-avatar">{name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><b>{name}</b><small>{account.email || account.id}</small></div></div>;
}

type AccountDialog = { kind: 'create' } | { kind: 'edit' | 'details' | 'subUsers'; id: string }
  | { kind: 'delete'; id: string } | { kind: 'status'; id: string; active: boolean };

function Accounts({ team = false }: { team?: boolean }) {
  const language = useUILanguage();
  const source = usePlatformAccounts();
  const filters = useFilters();
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState<PlatformTeamRole>('PLATFORM_SUPPORT');
  const requestId = useRef('');
  const rows = source.data.filter(account => team ? isPlatformTeamRole(account.role) : isAdminAccount(account));
  const visible = rows.filter(account => filters.matches([account.name, account.email, account.id], account.status));
  const selected = dialog && 'id' in dialog ? source.data.find(account => account.id === dialog.id) : undefined;
  const open = (next: AccountDialog) => {
    setError(''); setNotice(''); setRole('PLATFORM_SUPPORT');
    if (next.kind === 'create') requestId.current = crypto.randomUUID();
    setDialog(next);
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
    if (dialog.kind === 'edit' && selected) { void save({ operation: 'editAdmin', id: selected.id, name, email }, 'Admin details saved.'); return; }
    const password = String(fields.get('password') ?? '');
    if (password !== fields.get('confirmPassword')) { setError('Passwords must match.'); return; }
    const credentials = { name, email, password, requestId: requestId.current, language };
    if (team) void save({ operation: 'createMember', role, ...credentials }, 'Team member created.');
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
      <Grid columns={[team ? 'Member' : 'Admin', team ? 'Role' : 'Account ID', 'Status', 'Actions']} rows={visible.map(account => ({ id: account.id, cells: [
        <Person key="person" account={account}/>, isPlatformTeamRole(account.role) ? t(teamLabel[account.role]) : account.id, <Badge key="status" value={account.status}/>,
        <div key="actions" className="saw-actions">
          {!team && <><button onClick={() => open({ kind: 'details', id: account.id })}>{t('View details')}</button><button onClick={() => open({ kind: 'subUsers', id: account.id })}>{t('View sub-users')}</button><button disabled={source.cached} onClick={() => open({ kind: 'edit', id: account.id })}>{t('Edit')}</button></>}
          {account.role !== 'SUPER_ADMIN' && <button disabled={source.cached} onClick={() => open({ kind: 'status', id: account.id, active: account.status !== 'Active' })}>{t(account.status === 'Active' ? 'Suspend' : 'Activate')}</button>}
          {!team && <button disabled={source.cached} onClick={() => open({ kind: 'delete', id: account.id })}>{t('Delete')}</button>}
        </div>,
      ] }))}/>
    </LiveContent>
    {(dialog?.kind === 'create' || dialog?.kind === 'edit' && selected) && <Modal title={dialog.kind === 'edit' ? 'Edit admin' : team ? 'Add team member' : 'Add admin'} close={close}>
      <form className="saw-modal-form" onSubmit={submit}>
        <label>{t('Name')}<input name="name" required maxLength={80} defaultValue={selected?.name} autoFocus disabled={busy}/></label>
        <label>{t('Email')}<input name="email" type="email" required maxLength={160} defaultValue={selected?.email} disabled={busy}/></label>
        {dialog.kind === 'create' && <><label>{t('Password')}<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy}/></label>
          <label>{t('Confirm Password')}<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy}/></label>
          {team ? <label>{t('Role')}<DashboardSelect value={role} onChange={event => { if (isPlatformTeamRole(event.target.value)) setRole(event.target.value); }} disabled={busy}>{platformTeamRoles.map(value => <option key={value} value={value}>{t(teamLabel[value])}</option>)}</DashboardSelect></label>
            : <p>{t('The admin can open the default Agency workspace from the account switcher. Both use the admin’s credit and wallet balances.')}</p>}
        </>}
        {error && <p role="alert" className="saw-warning">{t(error)}</p>}
        <button className="saw-primary" disabled={busy || source.cached} type="submit">{t(busy ? 'Saving…' : dialog.kind === 'edit' ? 'Save changes' : team ? 'Create team member' : 'Create admin')}</button>
      </form>
    </Modal>}
    {dialog?.kind === 'details' && selected && <Modal title="Admin details" close={close}><div className="saw-detail"><h3>{selected.name || selected.id}</h3><p>{selected.email}</p><Badge value={selected.status}/><dl>
      <div><dt>{t('Account ID')}</dt><dd className="break-all">{selected.id}</dd></div><div><dt>{t('Workspace')}</dt><dd className="break-all">{selected.tenantId || '—'}</dd></div><div><dt>{t('Joined')}</dt><dd>{displayDate(selected.joined)}</dd></div><div><dt>{t('Linked users')}</dt><dd>{source.data.filter(row => isSubUser(row, selected)).length}</dd></div>
    </dl></div></Modal>}
    {dialog?.kind === 'subUsers' && selected && <Modal title="Sub-users" close={close}><div className="saw-detail"><h3>{selected.name || selected.id}</h3><p>{selected.email}</p></div><Grid columns={['User', 'Account type', 'Status']} rows={source.data.filter(row => isSubUser(row, selected)).map(row => ({ id: row.id, cells: [<Person key="person" account={row}/>, t(row.agency ? 'Agency user' : 'User'), <Badge key="status" value={row.status}/>] }))}/></Modal>}
    {(dialog?.kind === 'delete' || dialog?.kind === 'status') && selected && <Modal title={dialog.kind === 'delete' ? 'Delete admin' : dialog.active ? 'Activate account' : 'Suspend account'} close={close}>
      <p>{selected.name || selected.email || selected.id}</p>
      {dialog.kind === 'delete' && <p>{t('The admin and default Agency sign-in will be deleted. Billing history and workspace records are retained.')}</p>}
      {error && <p role="alert" className="saw-warning">{t(error)}</p>}
      <div className="saw-actions"><button disabled={busy} onClick={close}>{t('Cancel')}</button><button className="saw-primary" disabled={busy || source.cached} onClick={() => {
        if (dialog.kind === 'delete') void save({ operation: 'deleteAdmin', id: selected.id }, 'Admin deleted.');
        else void save({ operation: 'setStatus', id: selected.id, active: dialog.active }, 'Account status updated.');
      }}>{t(busy ? 'Saving…' : 'Confirm change')}</button></div>
    </Modal>}
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
  const payments = usePlatformPayments(true), usage = usePlatformUsage(), wallet = usePlatformWallet();
  const [months, setMonths] = useState(6);
  const revenue = payments.data.filter(row => row.platformRevenue);
  const credits = usage.data.reduce((sum, row) => sum + row.amount, 0);
  const byService = new Map<string, number>();
  for (const row of usage.data) {
    const service = row.description || t('General usage');
    byService.set(service, (byService.get(service) ?? 0) + row.amount);
  }
  return <>
    <Heading title="Usage & Revenue" description="Track recorded credit consumption, billing activity and the platform wallet."/>
    <LiveContent sources={[payments, usage, wallet]}>
      <div className="saw-stats"><Stat label="Credits consumed" value={credits.toLocaleString()} note="Recorded credit ledger usage"/><Stat label="Platform revenue" value={totals(revenue)} note="Manually approved plans and add-ons"/><Stat label="Active transactions" value={payments.data.filter(row => row.status === 'Pending' || row.status === 'Unverified').length} note="Awaiting payment or review"/><Stat label="Platform wallet balance" value={displayMoney(wallet.data.balance, wallet.data.currency)} note={wallet.data.balance === null ? 'Wallet record unavailable' : 'Communication wallet'}/></div>
      <Period months={months} setMonths={setMonths}/>
      <div className="saw-two-column"><Growth payments={revenue} months={months}/><section className="saw-panel"><h2>{t('Resource consumption')}</h2><p>{t('Credits consumed by activity')}</p>
        {!byService.size && <p className="saw-empty">{t('No credit usage recorded.')}</p>}
        {[...byService].sort(([, a], [, b]) => b - a).slice(0, 8).map(([service, count]) => <div className="saw-adoption" key={service}><div><span>{service}</span><b>{count.toLocaleString()}</b></div><progress aria-label={service} max={Math.max(1, credits)} value={count}/></div>)}
      </section></div>
    </LiveContent>
  </>;
}

function Wallet() {
  const source = usePlatformWallet(), managed = useManagedWallets();
  const { balance, available, held, currency } = source.data;
  const groups = new Map<string, { balance: number; available: number; held: number; count: number }>();
  for (const row of managed.data) {
    if (row.id === 'platform' || row.balance === null || !row.currency) continue;
    const previous = groups.get(row.currency) ?? { balance: 0, available: 0, held: 0, count: 0 };
    groups.set(row.currency, { balance: previous.balance + row.balance, available: previous.available + (row.available ?? 0), held: previous.held + row.held, count: previous.count + 1 });
  }
  return <>
    <Heading title="Wallet" description="View the platform communication wallet and available funds."/>
    <LiveContent sources={[source, managed]}>
      {balance === null ? <div className="saw-panel saw-empty">{t('A platform communication wallet has not been recorded.')}</div> : <div className="saw-stats">
        <Stat label="Wallet balance" value={displayMoney(balance, currency)} note="Platform communication wallet"/>
        <Stat label="Available balance" value={displayMoney(available, currency)} note="Funds available to spend"/>
        <Stat label="Held balance" value={displayMoney(held, currency)} note="Reserved funds"/>
      </div>}
      <div className="saw-section-head"><h2>{t('Admin wallet balances')}</h2><span>{t('Communication wallets funded through the platform')}</span></div>
      <Grid columns={['Currency', 'Wallets', 'Balance', 'Available', 'Held']} rows={[...groups].map(([currency, row]) => ({ id: currency, cells: [currency, row.count, displayMoney(row.balance, currency), displayMoney(row.available, currency), displayMoney(row.held, currency)] }))}/>
    </LiveContent>
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
  const gateways = usePaymentMethods(), tracking = useTrackingConfig(true);
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
  const Screen = screens[pathname.split('/')[2] || 'overview'] ?? Overview;
  return <RetryContext.Provider value={() => setAttempt(value => value + 1)}><div className="saw-workspace"><Screen key={`${uid}:${pathname}:${search}:${attempt}`}/></div></RetryContext.Provider>;
}
