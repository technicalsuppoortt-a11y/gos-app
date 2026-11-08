import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Badge, Card, Field, Modal, PanelHeading } from './kit';
import { Select } from '../../components/ui/Select';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import {
  buildTabPermissionsMap,
  modulePermissions,
  normalizeMemberRecord,
  permissionsForRole,
  platformModulePermissions,
  readTeam,
  ROLE_PRESETS,
  saveLocal,
  settingsTabPermissions,
  type Member,
  type RolePresetKey,
  type TeamState,
} from './localState';
import { useTablePagination } from '../commerce/useTablePagination';
import { TeamPagination } from './TeamPagination';
import { showToast } from '../../utils/toast';

export { SecurityPanel } from './SecurityPanel';

const ROLE_OPTIONS = [
  'Manager',
  'Editor',
  'Viewer',
  'Custom',
  'Admin',
  'Sales',
  'Support',
];

function detectPreset(perms: string[]): RolePresetKey {
  const clean = new Set(perms.filter(p => p !== 'settings' && p !== '*'));
  for (const key of ['full', 'commerce', 'support'] as const) {
    const target = ROLE_PRESETS[key].permissions;
    if (target.length === clean.size && target.every(id => clean.has(id))) {
      return key;
    }
  }
  return 'custom';
}

export function TeamPanel() {
  useUILanguage();
  const user = useSelector((state: RootState) => state.auth.user);
  const tenant = useSelector((state: RootState) => state.auth.tenant);
  const role = useSelector((state: RootState) => state.auth.role);

  const [team, setTeam] = useState<TeamState>(() => readTeam());
  const [draft, setDraft] = useState<Member | null>(null);
  const [removal, setRemoval] = useState<Member | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showPassword, setShowPassword] = useState(false);

  // Workspace owners (Business Owner / Admin) always have permission to manage team members
  const isWorkspaceOwner = useMemo(() => {
    if (!user) return true;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
    if (!tenant?.id || tenant.id === user.id || tenant.id === `workspace-${user.id}`) return true;
    const myRecord = team.members.find(
      m => m.id === user.id || m.email?.toLowerCase() === user.email?.toLowerCase(),
    );
    if (!myRecord) return true;
    return (
      Boolean(myRecord.isOwner) ||
      ['Owner', 'Admin', 'Manager'].includes(myRecord.role) ||
      myRecord.permissions?.includes('*') ||
      myRecord.permissions?.includes('settings:team')
    );
  }, [user, tenant?.id, role, team.members]);

  const canManage = !settingsApiEnabled || isWorkspaceOwner;

  const close = useCallback(() => {
    setDraft(null);
    setError('');
  }, []);

  const closeRemoval = useCallback(() => setRemoval(null), []);

  const load = useCallback(async () => {
    if (!settingsApiEnabled) {
      setTeam(readTeam());
      return;
    }
    setBusy(true);
    try {
      const [teamRes, auditRes] = await Promise.all([
        settingsRequest<{ members: Partial<Member>[] }>('/team'),
        settingsRequest<{ entries: string[] }>('/team/audit').catch(() => ({ entries: [] })),
      ]);
      const normalized = (teamRes.members ?? []).map(m => normalizeMemberRecord(m));
      const localFallback = readTeam();
      const mergedMembers = normalized.length > 0 ? normalized : localFallback.members;
      const nextState: TeamState = {
        members: mergedMembers,
        audit: auditRes.entries?.length ? auditRes.entries : localFallback.audit,
      };
      setTeam(nextState);
      saveLocal('team', nextState);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAddMemberModal = () => {
    setError('');
    setShowPassword(false);
    const initial = permissionsForRole('Manager');
    setDraft({
      id: crypto.randomUUID(),
      name: '',
      email: '',
      password: '',
      role: 'Manager',
      active: true,
      preset: initial.preset,
      permissions: initial.permissions,
      allowedModules: initial.permissions,
      tabPermissions: buildTabPermissionsMap(initial.permissions),
    });
  };

  const applyPreset = (presetKey: RolePresetKey) => {
    if (!draft) return;
    if (presetKey === 'custom') {
      setDraft({ ...draft, preset: 'custom' });
      return;
    }
    const nextPerms = [...ROLE_PRESETS[presetKey].permissions];
    setDraft({
      ...draft,
      preset: presetKey,
      permissions: nextPerms,
      allowedModules: nextPerms,
      tabPermissions: buildTabPermissionsMap(nextPerms),
    });
  };

  const handleRoleChange = (nextRole: string) => {
    if (!draft) return;
    if (nextRole === 'Custom') {
      setDraft({ ...draft, role: nextRole, preset: 'custom' });
      return;
    }
    const mapped = permissionsForRole(nextRole);
    setDraft({
      ...draft,
      role: nextRole,
      preset: mapped.preset,
      permissions: mapped.permissions,
      allowedModules: mapped.permissions,
      tabPermissions: buildTabPermissionsMap(mapped.permissions),
    });
  };

  const togglePermission = (permId: string, checked: boolean) => {
    if (!draft) return;
    const current = new Set(draft.permissions.filter(p => p !== 'settings' && p !== '*'));
    if (checked) current.add(permId);
    else current.delete(permId);
    const nextPerms = Array.from(current);
    const nextPreset = detectPreset(nextPerms);
    setDraft({
      ...draft,
      preset: nextPreset,
      permissions: nextPerms,
      allowedModules: nextPerms,
      tabPermissions: buildTabPermissionsMap(nextPerms),
    });
  };

  const toggleCategoryAll = (category: 'module' | 'settings', selectAll: boolean) => {
    if (!draft) return;
    const targetIds = (
      category === 'module' ? platformModulePermissions : settingsTabPermissions
    ).map(item => item.id);
    const current = new Set(draft.permissions.filter(p => p !== 'settings' && p !== '*'));
    for (const id of targetIds) {
      if (selectAll) current.add(id);
      else current.delete(id);
    }
    const nextPerms = Array.from(current);
    setDraft({
      ...draft,
      preset: detectPreset(nextPerms),
      permissions: nextPerms,
      allowedModules: nextPerms,
      tabPermissions: buildTabPermissionsMap(nextPerms),
    });
  };

  async function commit(member: Member, remove = false) {
    if (!canManage || member.role === 'Owner' || member.isOwner) return;
    if (!remove && (!member.name.trim() || !member.email.trim())) {
      setError(translateText('Enter a full name and email address.'));
      return;
    }
    if (
      !remove &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())
    ) {
      setError(translateText('Enter a valid email address.'));
      return;
    }
    if (
      !remove &&
      team.members.some(
        existing =>
          existing.id !== member.id &&
          existing.email.toLowerCase() === member.email.trim().toLowerCase(),
      )
    ) {
      setError(translateText('A team member already uses this email address.'));
      return;
    }
    if (!remove && member.permissions.length === 0) {
      setError(translateText('Select at least one module or settings tab for this team member.'));
      return;
    }

    const exists = team.members.some(existing => existing.id === member.id);
    const trimmedPassword = (member.password || '').trim();
    if (!remove && !exists && trimmedPassword.length < 6) {
      setError(translateText('Enter a login password of at least 6 characters for this team member.'));
      return;
    }
    if (!remove && exists && trimmedPassword.length > 0 && trimmedPassword.length < 6) {
      setError(translateText('New password must be at least 6 characters.'));
      return;
    }

    setBusy(true);
    setError('');
    const cleanPerms = [...new Set(member.permissions.filter(Boolean))];
    if (cleanPerms.some(p => p.startsWith('settings:')) && !cleanPerms.includes('settings')) {
      cleanPerms.push('settings');
    }
    const updatedMember: Member = {
      ...member,
      name: member.name.trim(),
      email: member.email.trim().toLowerCase(),
      ...(trimmedPassword ? { password: trimmedPassword, hasPassword: true } : {}),
      permissions: cleanPerms,
      allowedModules: cleanPerms,
      tabPermissions: buildTabPermissionsMap(cleanPerms),
      updatedAt: new Date().toISOString(),
    };

    try {
      let savedServerMember: Partial<Member> | undefined;
      if (settingsApiEnabled) {
        const res = await settingsRequest<{ success: boolean; member?: Partial<Member> }>(
          exists ? `/team/${encodeURIComponent(member.id)}` : '/team',
          remove ? undefined : updatedMember,
          remove ? 'DELETE' : exists ? 'PATCH' : 'POST',
        );
        savedServerMember = res?.member;
      }

      const finalMember: Member = savedServerMember
        ? normalizeMemberRecord({ ...updatedMember, ...savedServerMember })
        : { ...updatedMember, password: undefined };

      const nextLocal: TeamState = {
        members: remove
          ? team.members.filter(existing => existing.id !== member.id)
          : exists
          ? team.members.map(existing => (existing.id === member.id ? finalMember : existing))
          : [...team.members, finalMember],
        audit: [
          `${new Date().toLocaleString('en-GB')} · ${
            remove ? 'Removed' : exists ? 'Updated' : 'Added'
          } ${updatedMember.name} (${updatedMember.role})`,
          ...team.audit,
        ],
      };

      saveLocal('team', nextLocal);
      setTeam(nextLocal);
      if (settingsApiEnabled) {
        await load();
        window.dispatchEvent(new Event('gos-settings-changed'));
      }

      showToast.success(
        translateText(
          remove
            ? 'Team member removed.'
            : exists
            ? 'Team member permissions updated.'
            : 'Team member added and login credentials provisioned.',
        ),
      );
      setDraft(null);
      setRemoval(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleMemberActive(member: Member) {
    const isOwnerRow = member.role === 'Owner' || Boolean(member.isOwner);
    if (!canManage || isOwnerRow || busy || togglingId === member.id) return;
    const nextActive = !member.active;
    setTogglingId(member.id);
    setError('');
    const cleanPerms = [...new Set(member.permissions.filter(Boolean))];
    if (cleanPerms.some(p => p.startsWith('settings:')) && !cleanPerms.includes('settings')) {
      cleanPerms.push('settings');
    }
    const updatedMember: Member = {
      ...member,
      active: nextActive,
      permissions: cleanPerms,
      allowedModules: cleanPerms,
      tabPermissions: buildTabPermissionsMap(cleanPerms),
      updatedAt: new Date().toISOString(),
    };
    const nextLocal: TeamState = {
      members: team.members.map(existing => (existing.id === member.id ? updatedMember : existing)),
      audit: [
        `${new Date().toLocaleString('en-GB')} · ${nextActive ? 'Activated' : 'Deactivated'} ${updatedMember.name} (${updatedMember.role})`,
        ...team.audit,
      ],
    };
    setTeam(nextLocal);
    saveLocal('team', nextLocal);
    try {
      if (settingsApiEnabled) {
        await settingsRequest(`/team/${encodeURIComponent(member.id)}`, updatedMember, 'PATCH');
        window.dispatchEvent(new Event('gos-settings-changed'));
      }
      showToast.success(
        translateText(
          nextActive
            ? `${member.name} is now active.`
            : `${member.name} has been deactivated.`,
        ),
      );
    } catch (e) {
      setError(friendlyError(e));
      await load();
    } finally {
      setTogglingId(null);
    }
  }

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { All: team.members.length };
    for (const m of team.members) {
      const r = m.role === 'Owner' || m.isOwner ? 'Owner' : m.role || 'Manager';
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [team.members]);

  const rolePills = useMemo(() => {
    const base = ['All', 'Owner', 'Manager', 'Editor', 'Viewer', 'Support', 'Sales', 'Admin', 'Custom'];
    for (const m of team.members) {
      if (m.role && !base.includes(m.role)) base.push(m.role);
    }
    return base.filter(r => r === 'All' || (roleCounts[r] ?? 0) > 0 || ['Owner', 'Manager', 'Editor', 'Support', 'Viewer'].includes(r));
  }, [team.members, roleCounts]);

  const members = team.members.filter(member => {
    const matchesSearch = `${member.name} ${member.email} ${member.role}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const memberRoleNormalized = member.role === 'Owner' || member.isOwner ? 'Owner' : member.role;
    const matchesRole =
      roleFilter === 'All' ||
      memberRoleNormalized.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' ? member.active !== false : member.active === false);
    return matchesSearch && matchesRole && matchesStatus;
  });
  const pagination = useTablePagination(members.length);
  const visibleMembers = members.slice(
    pagination.offset,
    pagination.offset + pagination.pageSize,
  );

  const selectedModuleCount = draft
    ? platformModulePermissions.filter(m => draft.permissions.includes(m.id)).length
    : 0;
  const selectedSettingsCount = draft
    ? settingsTabPermissions.filter(s => draft.permissions.includes(s.id)).length
    : 0;

  return (
    <>
      <PanelHeading
        title={translateText('Team & roles')}
        description="Manage your team members and configure granular sidebar module and settings tab permissions."
      />

      <Card
        title={translateText('Team members')}
        description={
          settingsApiEnabled
            ? 'Assign workspace roles and control which sidebar modules and settings tabs each member can access.'
            : 'Demo team · changes are saved on this device.'
        }
        action={
          <button
            type="button"
            className="st-primary"
            disabled={!canManage || busy}
            onClick={openAddMemberModal}
          >
            <Plus size={15} />
            {translateText('Add member')}
          </button>
        }
      >
        {localizeNode(
          !canManage && (
            <p className="st-note">
              {translateText('Only workspace administrators can manage team members.')}
            </p>
          ),
        )}
        {localizeNode(
          error && !draft && !removal && (
            <p className="st-error" role="alert">
              {localizeNode(error)}
            </p>
          ),
        )}

        <div className="st-team-toolbar">
          <div className="st-team-toolbar-top">
            <label className="st-search st-team-search">
              <Search size={16} />
              <input
                type="search"
                aria-label={translateText('Search team members')}
                placeholder={translateText('Search name, email or role…')}
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  pagination.setPage(0);
                }}
              />
            </label>

            <div className="st-team-filter-selects">
              <div className="st-team-select-wrap">
                <Filter size={13} className="st-team-select-icon" />
                <select
                  aria-label={translateText('Filter by role')}
                  value={roleFilter}
                  onChange={e => {
                    setRoleFilter(e.target.value);
                    pagination.setPage(0);
                  }}
                >
                  <option value="All">{translateText('All Roles')} ({team.members.length})</option>
                  {['Owner', ...ROLE_OPTIONS].map(r => (
                    <option key={r} value={r}>
                      {translateText(r)} ({roleCounts[r] ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="st-team-select-wrap">
                <select
                  aria-label={translateText('Filter by status')}
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive');
                    pagination.setPage(0);
                  }}
                >
                  <option value="All">{translateText('All Status')}</option>
                  <option value="Active">
                    {translateText('Active')} ({team.members.filter(m => m.active !== false).length})
                  </option>
                  <option value="Inactive">
                    {translateText('Inactive')} ({team.members.filter(m => m.active === false).length})
                  </option>
                </select>
              </div>

              {(query.trim() !== '' || roleFilter !== 'All' || statusFilter !== 'All') && (
                <button
                  type="button"
                  className="st-team-reset-btn"
                  onClick={() => {
                    setQuery('');
                    setRoleFilter('All');
                    setStatusFilter('All');
                    pagination.setPage(0);
                  }}
                >
                  <RotateCcw size={13} />
                  {translateText('Reset')}
                </button>
              )}
            </div>
          </div>

          <div className="st-team-role-pills" role="tablist" aria-label={translateText('Filter members by role')}>
            {rolePills.map(r => {
              const isSelected = roleFilter.toLowerCase() === r.toLowerCase();
              const count = r === 'All' ? team.members.length : roleCounts[r] ?? 0;
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`st-team-role-pill${isSelected ? ' is-active' : ''}`}
                  onClick={() => {
                    setRoleFilter(r);
                    pagination.setPage(0);
                  }}
                >
                  <span>{r === 'All' ? translateText('All Roles') : translateText(r)}</span>
                  <span className="st-team-role-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="st-table-scroll">
          <table>
            <thead>
              <tr>
                <th className="text-start">{translateText('Member')}</th>
                <th className="text-center">{translateText('Role')}</th>
                <th className="text-center">{translateText('Status')}</th>
                <th className="text-center">{translateText('Allowed Modules & Tabs')}</th>
                <th className="text-center" style={{ width: 220 }}>
                  {translateText('Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map(member => {
                const isOwnerRow = member.role === 'Owner' || Boolean(member.isOwner);
                const allowedModCount = isOwnerRow
                  ? platformModulePermissions.length
                  : platformModulePermissions.filter(m => member.permissions.includes(m.id)).length;
                const allowedSetCount = isOwnerRow
                  ? settingsTabPermissions.length
                  : settingsTabPermissions.filter(s => member.permissions.includes(s.id)).length;
                const tooltipList = isOwnerRow
                  ? 'Full Access (Workspace Owner — 100% access to all modules & settings)'
                  : modulePermissions
                      .filter(m => member.permissions.includes(m.id))
                      .map(m => m.label)
                      .join(', ');

                return (
                  <tr key={member.id}>
                    <td className="text-start">
                      <div className="st-member-cell">
                        <span className="st-member-avatar">
                          {localizeNode(
                            (member.name || member.email || 'M')
                              .split(' ')
                              .map(word => word[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase(),
                          )}
                        </span>
                        <span>
                          <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {localizeNode(member.name)}
                            {isOwnerRow && (
                              <Badge tone="purple">{translateText('Owner')}</Badge>
                            )}
                          </b>
                          <small>{member.email}</small>
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      <Badge tone={isOwnerRow ? 'purple' : 'neutral'}>
                        {localizeNode(member.role)}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Badge tone={member.active ? 'green' : 'neutral'}>
                        {localizeNode(member.active ? 'Active' : 'Inactive')}
                      </Badge>
                    </td>
                    <td className="text-center">
                      {isOwnerRow ? (
                        <span
                          title={translateText(tooltipList)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            fontWeight: 600,
                            fontSize: 11.5,
                          }}
                        >
                          <ShieldCheck size={13} />
                          {translateText('Full Access (All tabs)')}
                        </span>
                      ) : (
                        <span
                          title={translateText(tooltipList)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#334155',
                            fontWeight: 600,
                            fontSize: 11.5,
                          }}
                        >
                          <span>
                            {localizeNode(allowedModCount)}/{platformModulePermissions.length}{' '}
                            {translateText('modules')}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>
                            {localizeNode(allowedSetCount)}/{settingsTabPermissions.length}{' '}
                            {translateText('settings')}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="st-member-actions justify-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={member.active}
                          aria-label={translateText(`Toggle active status for ${member.name}`)}
                          title={translateText(
                            isOwnerRow
                              ? 'Workspace owner is always active'
                              : member.active
                              ? 'Active — click to deactivate member login'
                              : 'Inactive — click to activate member login',
                          )}
                          disabled={!canManage || busy || isOwnerRow || togglingId === member.id}
                          onClick={() => void toggleMemberActive(member)}
                          className={`st-action-toggle${member.active ? ' is-on' : ''}`}
                        >
                          <span className="st-action-toggle-track">
                            <span className="st-action-toggle-thumb" />
                          </span>
                          <span className="st-action-toggle-label">
                            {localizeNode(member.active ? 'Active' : 'Off')}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="st-secondary small"
                          aria-label={translateText(`Edit ${member.name}`)}
                          disabled={!canManage || busy || isOwnerRow}
                          onClick={() => {
                            setError('');
                            setShowPassword(false);
                            const clean = member.permissions.filter(
                              p => p !== 'settings' && p !== '*',
                            );
                            setDraft({
                              ...member,
                              password: '',
                              preset: member.preset ?? detectPreset(clean),
                              permissions: [...clean],
                              allowedModules: [...clean],
                              tabPermissions: buildTabPermissionsMap(clean),
                            });
                          }}
                        >
                          <Pencil size={14} />
                          {translateText('Edit')}
                        </button>
                        <button
                          type="button"
                          className="st-danger"
                          aria-label={translateText(`Delete ${member.name}`)}
                          disabled={!canManage || busy || isOwnerRow}
                          onClick={() => {
                            setError('');
                            setRemoval(member);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {localizeNode(
          !members.length && (
            <p className="st-note">
              {localizeNode(busy ? 'Loading members…' : 'No members match your search.')}
            </p>
          ),
        )}
        <TeamPagination pagination={pagination} />
      </Card>

      <Card
        title={translateText('Permissions & audit')}
        description="The workspace owner keeps 100% full access. Assign individual module and settings tab visibility when adding or editing a member."
      >
        <button
          type="button"
          className="st-secondary"
          disabled={busy || !canManage}
          onClick={async () => {
            if (!settingsApiEnabled) {
              setTeam(readTeam());
              return;
            }
            try {
              const result = await settingsRequest<{ entries: string[] }>('/team/audit');
              setTeam(current => ({ ...current, audit: result.entries }));
            } catch (e) {
              setError(friendlyError(e));
            }
          }}
        >
          {translateText('Refresh activity log')}
        </button>
        <ul className="st-audit-list">
          {localizeNode(
            team.audit.slice(0, 10).map((entry, index) => <li key={index}>{localizeNode(entry)}</li>),
          )}
        </ul>
        {localizeNode(
          !team.audit.length && <p className="st-note">{translateText('No activity recorded.')}</p>,
        )}
      </Card>

      {/* Add / Edit Team Member Modal with Granular Tab & Module Permissions Picker */}
      {draft && (
        <Modal
          title={translateText(
            team.members.some(member => member.id === draft.id)
              ? 'Edit Team Member & Permissions'
              : 'Add Team Member',
          )}
          close={close}
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              void commit(draft);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Member Identity & Role Inputs */}
            <div className="st-form-grid two" style={{ marginTop: 0 }}>
              <Field label="Full Name">
                <input
                  required
                  maxLength={100}
                  placeholder={translateText('e.g. Sarah Ahmed')}
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Email Address">
                <input
                  required
                  type="email"
                  placeholder="member@company.com"
                  value={draft.email}
                  onChange={e => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
              <Field label="Role">
                <Select
                  value={draft.role}
                  onChange={handleRoleChange}
                  options={ROLE_OPTIONS}
                />
              </Field>
              <Field label="Account Status">
                <Select
                  value={draft.active ? 'Active' : 'Inactive'}
                  onChange={value => setDraft({ ...draft, active: value === 'Active' })}
                  options={['Active', 'Inactive']}
                />
              </Field>
            </div>

            {/* Login Password Section for Team Member */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14,
                background: '#fcfaff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1e293b',
                  }}
                >
                  <KeyRound size={14} style={{ color: '#7c3aed' }} />
                  {translateText(
                    team.members.some(m => m.id === draft.id)
                      ? 'Dashboard Login Password (Optional update)'
                      : 'Dashboard Login Password *',
                  )}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {team.members.some(m => m.id === draft.id) && draft.hasPassword && (
                    <Badge tone="green">{translateText('Login Enabled')}</Badge>
                  )}
                  <button
                    type="button"
                    className="st-link"
                    onClick={() => {
                      const generated = `Team@${Math.random().toString(36).slice(2, 6)}${Math.floor(10 + Math.random() * 89)}!`;
                      setDraft({ ...draft, password: generated });
                      setShowPassword(true);
                      if (navigator.clipboard) {
                        void navigator.clipboard.writeText(generated).catch(() => null);
                      }
                      showToast.info(translateText('Generated password and copied to clipboard.'));
                    }}
                  >
                    <Sparkles size={12} />
                    {translateText('Generate password')}
                  </button>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!team.members.some(m => m.id === draft.id)}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder={translateText(
                    team.members.some(m => m.id === draft.id)
                      ? 'Enter a new password to change login password (min 6 chars)…'
                      : 'Enter login password for this member (min 6 chars)…',
                  )}
                  value={draft.password ?? ''}
                  onChange={e => setDraft({ ...draft, password: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: 38,
                    padding: '8px 38px 8px 12px',
                    fontSize: 12.5,
                    borderRadius: 9,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={translateText(showPassword ? 'Hide password' : 'Show password')}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#64748b' }}>
                {translateText(
                  'This team member can sign in to the User Dashboard (/auth/login) using their email and password under your workspace.',
                )}
              </small>
            </div>

            {/* Quick Role Presets */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 14,
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1e293b',
                  }}
                >
                  <Sparkles size={14} style={{ color: '#7c3aed' }} />
                  {translateText('Quick Access Presets')}
                </span>
                <small style={{ fontSize: 11, color: '#64748b' }}>
                  {translateText('Choose a preset or customize individual tabs below')}
                </small>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {(['full', 'commerce', 'support', 'custom'] as const).map(presetKey => {
                  const preset = ROLE_PRESETS[presetKey];
                  const isSelected = (draft.preset ?? detectPreset(draft.permissions)) === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => applyPreset(presetKey)}
                      style={{
                        textAlign: 'left',
                        padding: '9px 11px',
                        borderRadius: 9,
                        border: isSelected ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                        background: isSelected ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 12,
                            color: isSelected ? '#6d28d9' : '#0f172a',
                          }}
                        >
                          {translateText(preset.label)}
                        </strong>
                        {isSelected && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: '#7c3aed',
                            }}
                          />
                        )}
                      </div>
                      <small
                        style={{
                          display: 'block',
                          fontSize: 10.5,
                          color: '#64748b',
                          marginTop: 2,
                          lineHeight: 1.35,
                        }}
                      >
                        {translateText(preset.description)}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 1: Platform Modules (Main Sidebar Navigation) */}
            <fieldset className="st-permissions" style={{ marginTop: 0 }}>
              <legend
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#1e293b',
                }}
              >
                <Layers size={14} style={{ color: '#7c3aed' }} />
                <span>
                  {translateText('Platform Modules (Sidebar Navigation)')} (
                  {selectedModuleCount}/{platformModulePermissions.length})
                </span>
              </legend>
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 6,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <small style={{ fontSize: 11, color: '#64748b' }}>
                  {translateText('Unchecked modules will be hidden from the member’s sidebar.')}
                </small>
                <div style={{ display: 'inline-flex', gap: 10 }}>
                  <button
                    type="button"
                    className="st-link"
                    onClick={() => toggleCategoryAll('module', true)}
                  >
                    <CheckSquare size={12} />
                    {translateText('Select all')}
                  </button>
                  <button
                    type="button"
                    className="st-link"
                    onClick={() => toggleCategoryAll('module', false)}
                  >
                    <Square size={12} />
                    {translateText('Clear')}
                  </button>
                </div>
              </div>
              {localizeNode(
                platformModulePermissions.map(module => {
                  const checked = draft.permissions.includes(module.id);
                  return (
                    <label
                      key={module.id}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: checked ? '1px solid #ddd6fe' : '1px solid #f1f5f9',
                        background: checked ? '#faf5ff' : '#ffffff',
                        cursor: 'pointer',
                        fontWeight: checked ? 600 : 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => togglePermission(module.id, e.target.checked)}
                      />
                      <span>{localizeNode(module.label)}</span>
                    </label>
                  );
                }),
              )}
            </fieldset>

            {/* Section 2: Settings Tabs (/dashboard/settings/*) */}
            <fieldset className="st-permissions" style={{ marginTop: 0 }}>
              <legend
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#1e293b',
                }}
              >
                <SettingsIcon size={14} style={{ color: '#7c3aed' }} />
                <span>
                  {translateText('Settings Tabs')} ({selectedSettingsCount}/
                  {settingsTabPermissions.length})
                </span>
              </legend>
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 6,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <small style={{ fontSize: 11, color: '#64748b' }}>
                  {translateText('Choose which workspace settings tabs this member can access.')}
                </small>
                <div style={{ display: 'inline-flex', gap: 10 }}>
                  <button
                    type="button"
                    className="st-link"
                    onClick={() => toggleCategoryAll('settings', true)}
                  >
                    <CheckSquare size={12} />
                    {translateText('Select all')}
                  </button>
                  <button
                    type="button"
                    className="st-link"
                    onClick={() => toggleCategoryAll('settings', false)}
                  >
                    <Square size={12} />
                    {translateText('Clear')}
                  </button>
                </div>
              </div>
              {localizeNode(
                settingsTabPermissions.map(tab => {
                  const checked = draft.permissions.includes(tab.id);
                  return (
                    <label
                      key={tab.id}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: checked ? '1px solid #ddd6fe' : '1px solid #f1f5f9',
                        background: checked ? '#faf5ff' : '#ffffff',
                        cursor: 'pointer',
                        fontWeight: checked ? 600 : 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => togglePermission(tab.id, e.target.checked)}
                      />
                      <span>{localizeNode(tab.label)}</span>
                    </label>
                  );
                }),
              )}
            </fieldset>

            {localizeNode(
              error && (
                <p className="st-error" role="alert">
                  {localizeNode(error)}
                </p>
              ),
            )}

            <div className="st-modal-actions" style={{ marginTop: 4 }}>
              <button
                type="button"
                className="st-secondary"
                disabled={busy}
                onClick={close}
              >
                {translateText('Cancel')}
              </button>
              <button type="submit" className="st-primary" disabled={busy}>
                {localizeNode(busy ? 'Saving…' : 'Save member')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {localizeNode(
        removal && (
          <Modal title={translateText('Delete team member')} close={closeRemoval}>
            <p>
              {translateText('Remove ')}
              <b>{localizeNode(removal.name)}</b>
              {translateText(' and revoke their workspace access?')}
            </p>
            {localizeNode(
              error && (
                <p className="st-error" role="alert">
                  {localizeNode(error)}
                </p>
              ),
            )}
            <div className="st-modal-actions">
              <button className="st-secondary" disabled={busy} onClick={closeRemoval}>
                {translateText('Cancel')}
              </button>
              <button
                className="st-danger"
                disabled={busy}
                onClick={() => void commit(removal, true)}
              >
                {localizeNode(busy ? 'Deleting…' : 'Delete member')}
              </button>
            </div>
          </Modal>
        ),
      )}
    </>
  );
}
