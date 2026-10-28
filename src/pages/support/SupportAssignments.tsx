import { useState } from 'react';
import { backendError, callBackend } from '../../backend/firebase';
import { useUILanguage } from '../../i18n/display';
type Account = { id: string; name: string; role: string; supportParentId: string };
export function SupportAssignments({ onSaved }: { onSaved: () => void }) {
  const ar = useUILanguage().startsWith('ar');
  const [users, setUsers] = useState<Account[]>([]), [target, setTarget] = useState(''), [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  async function load() {
    setBusy(true); setError('');
    try { setUsers((await callBackend<{ users: Account[] }>('supportChat', { operation: 'directory' })).users); }
    catch (e) { setError(backendError(e)); } finally { setBusy(false); }
  }
  async function assign() {
    setBusy(true); setError(''); setSaved(false);
    try { await callBackend('supportChat', { operation: 'assign', userId: target, parentId: parent }); setSaved(true); onSaved(); }
    catch (e) { setError(backendError(e)); } finally { setBusy(false); }
  }
  const role = users.find(u => u.id === target)?.role;
  return <details className="support-assignments" onToggle={e => { if (e.currentTarget.open && !users.length && !busy) void load(); }}><summary>{ar ? 'تعيين فرق الدعم' : 'Assign support teams'}</summary><form onSubmit={e => { e.preventDefault(); void assign(); }}><label>{ar ? 'الحساب' : 'Account'}<select required disabled={busy} value={target} onChange={e => { setTarget(e.target.value); setParent(''); setSaved(false); }}><option value="">{ar ? 'اختر حسابًا' : 'Choose an account'}</option>{users.filter(u => u.role !== 'SUPER_ADMIN').map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select></label><label>{ar ? 'مسؤول الدعم' : 'Support owner'}<select required value={parent} disabled={busy || !role} onChange={e => setParent(e.target.value)}><option value="">{ar ? 'اختر المسؤول' : 'Choose an owner'}</option>{users.filter(u => u.role === (role === 'USER' ? 'ADMIN' : 'SUPER_ADMIN')).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><button type="submit" disabled={busy || !target || !parent}>{ar ? 'حفظ التعيين' : 'Save assignment'}</button>{error && <p role="alert">{error}</p>}{saved && <p role="status">{ar ? 'تم حفظ التعيين.' : 'Assignment saved.'}</p>}</form></details>;
}
