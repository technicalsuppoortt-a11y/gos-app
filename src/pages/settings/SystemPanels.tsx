import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Badge, Card, Field, Modal, PanelHeading } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import { modulePermissions, readTeam, saveLocal } from './localState';
import type { Member, TeamState } from './localState';
import { useTablePagination } from '../commerce/useTablePagination';
import { TeamPagination } from './TeamPagination';
export { SecurityPanel } from './SecurityPanel';
export function TeamPanel() {
 const user = useSelector((state: RootState) => state.auth.user);
 const role = useSelector((state: RootState) => state.auth.role);
 const [team, setTeam] = useState<TeamState>(() => settingsApiEnabled ? { members: [], audit: [] } : readTeam());
 const [draft, setDraft] = useState<Member | null>(null), [removal, setRemoval] = useState<Member | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [query, setQuery] = useState('');
 const canManage = !settingsApiEnabled || role === 'ADMIN' || role === 'SUPER_ADMIN' || team.members.some(member => (member.id === user?.id || member.email.toLowerCase() === user?.email?.toLowerCase()) && member.active && ['Owner', 'Admin'].includes(member.role));
 const close = useCallback(() => { setDraft(null); setError(''); }, []);
 const closeRemoval = useCallback(() => setRemoval(null), []);
 const load = useCallback(async () => {
   if (!settingsApiEnabled) return;
   setBusy(true);
   try { const result = await settingsRequest<{ members: Member[] }>('/team'); setTeam({ members: result.members.map(member => ({ ...member, permissions: member.permissions ?? modulePermissions.map(module => module.id) })), audit: [] }); }
   catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
 }, []);
 useEffect(() => { void load(); }, [load]);
 async function commit(member: Member, remove = false) {
   if (!canManage || member.role === 'Owner') return;
   if (!remove && (!member.name.trim() || !member.email.trim())) { setError('Enter a name and email address.'); return; }
   if (!remove && team.members.some(existing => existing.id !== member.id && existing.email.toLowerCase() === member.email.trim().toLowerCase())) { setError('A team member already uses this email address.'); return; }
   setBusy(true); setError('');
   const exists = team.members.some(existing => existing.id === member.id);
   try {
     if (settingsApiEnabled) { await settingsRequest(exists ? `/team/${encodeURIComponent(member.id)}` : '/team', remove ? undefined : { ...member, name: member.name.trim(), email: member.email.trim() }, remove ? 'DELETE' : exists ? 'PATCH' : 'POST'); await load(); window.dispatchEvent(new Event('gos-settings-changed')); }
     else {
       const updated = { ...member, name: member.name.trim(), email: member.email.trim() };
       const next: TeamState = { members: remove ? team.members.filter(existing => existing.id !== member.id) : exists ? team.members.map(existing => existing.id === member.id ? updated : existing) : [...team.members, updated], audit: [`${new Date().toLocaleString('en-GB')} · ${remove ? 'Removed' : exists ? 'Updated' : 'Added'} ${member.name} (${member.role})`, ...team.audit] };
       saveLocal('team', next); setTeam(next);
     }
     setDraft(null); setRemoval(null);
   } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
 }
 const members = team.members.filter(member => `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(query.trim().toLowerCase()));
 const pagination = useTablePagination(members.length);
 const visibleMembers = members.slice(pagination.offset, pagination.offset + pagination.pageSize);
 return <><PanelHeading title="Team & roles" description="Manage your people and choose which workspace modules they can view."/><Card title="Team members" description={settingsApiEnabled ? 'Members and permissions from your workspace service.' : 'Demo team · changes are saved on this device.'} action={<button className="st-primary" disabled={!canManage || busy} onClick={() => { setError(''); setDraft({ id: crypto.randomUUID(), name: '', email: '', role: 'Member', active: true, permissions: ['home'] }); }}><Plus size={15}/>Add member</button>}>
 {!canManage && <p className="st-note">Only workspace administrators can manage team members.</p>}{error && !draft && !removal && <p className="st-error" role="alert">{error}</p>}<label className="st-search st-team-search"><Search size={16}/><input type="search" aria-label="Search team members" placeholder="Search name, email or role…" value={query} onChange={e => { setQuery(e.target.value); pagination.setPage(0); }}/></label><div className="st-table-scroll"><table><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Module access</th><th>Actions</th></tr></thead><tbody>{visibleMembers.map(member => <tr key={member.id}><td><div className="st-member-cell"><span className="st-member-avatar">{member.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span><span><b>{member.name}</b><small>{member.email}</small></span></div></td><td>{member.role}</td><td><Badge tone={member.active ? 'green' : 'neutral'}>{member.active ? 'Active' : 'Inactive'}</Badge></td><td><span title={modulePermissions.filter(module => member.permissions.includes(module.id)).map(module => module.label).join(', ')}>{member.permissions.length} modules</span></td><td><div className="st-member-actions"><button className="st-secondary small" aria-label={`Edit ${member.name}`} disabled={!canManage || busy || member.role === 'Owner'} onClick={() => { setError(''); setDraft({ ...member, permissions: [...member.permissions] }); }}><Pencil size={14}/>Edit</button><button className="st-danger" aria-label={`Delete ${member.name}`} disabled={!canManage || busy || member.role === 'Owner'} onClick={() => { setError(''); setRemoval(member); }}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>{!members.length && <p className="st-note">{busy ? 'Loading members…' : 'No members match your search.'}</p>}<TeamPagination pagination={pagination}/></Card>
 <Card title="Permissions & audit" description="The workspace owner keeps full access. Assign individual module visibility when adding or editing a member."><button className="st-secondary" disabled={busy || !canManage} onClick={async () => { if (!settingsApiEnabled) { setTeam(readTeam()); return; } try { const result = await settingsRequest<{ entries: string[] }>('/team/audit'); setTeam(current => ({ ...current, audit: result.entries })); } catch (e) { setError(friendlyError(e)); } }}>Refresh activity log</button><ul className="st-audit-list">{team.audit.slice(0, 10).map((entry, index) => <li key={index}>{entry}</li>)}</ul>{!team.audit.length && <p className="st-note">No activity recorded.</p>}</Card>
 {draft && <Modal title={team.members.some(member => member.id === draft.id) ? 'Edit team member' : 'Add team member'} close={close}><form onSubmit={e => { e.preventDefault(); void commit(draft); }}><div className="st-form-grid two"><Field label="Full name"><input required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field><Field label="Email address"><input required type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/></Field><Field label="Role"><Select value={draft.role} onChange={value => setDraft({ ...draft, role: value })} options={['Admin', 'Manager', 'Sales', 'Support', 'Member']} /></Field><Field label="Status"><Select value={draft.active ? 'Active' : 'Inactive'} onChange={value => setDraft({ ...draft, active: value === 'Active' })} options={['Active', 'Inactive']} /></Field></div><fieldset className="st-permissions"><legend>View access to modules</legend>{modulePermissions.map(module => <label key={module.id}><input type="checkbox" checked={draft.permissions.includes(module.id)} onChange={e => setDraft({ ...draft, permissions: e.target.checked ? [...draft.permissions, module.id] : draft.permissions.filter(id => id !== module.id) })}/>{module.label}</label>)}</fieldset>{error && <p className="st-error" role="alert">{error}</p>}<div className="st-modal-actions"><button type="button" className="st-secondary" disabled={busy} onClick={close}>Cancel</button><button className="st-primary" disabled={busy}>{busy ? 'Saving…' : 'Save member'}</button></div></form></Modal>}
 {removal && <Modal title="Delete team member" close={closeRemoval}><p>Remove {removal.name} and their workspace access?</p>{error && <p className="st-error" role="alert">{error}</p>}<div className="st-modal-actions"><button className="st-secondary" disabled={busy} onClick={closeRemoval}>Cancel</button><button className="st-danger" disabled={busy} onClick={() => void commit(removal, true)}>{busy ? 'Deleting…' : 'Delete member'}</button></div></Modal>}</>;
}
