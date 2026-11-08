import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { settingsApiEnabled } from './data';
import {
  normalizeMemberRecord,
  platformModulePermissions,
  readTeam,
  settingsTabPermissions,
  type Member,
} from './localState';
import { settingsAliases, settingsTabs } from './navigation';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../backend/firebase';

export function useModuleAccess() {
  const auth = useSelector((state: RootState) => state.auth);
  const [tenantMember, setTenantMember] = useState<Member | null>(null);
  const [settingsMembers, setSettingsMembers] = useState<Member[]>(() =>
    settingsApiEnabled ? [] : readTeam().members,
  );

  useEffect(() => {
    const syncLocal = () => {
      if (!settingsApiEnabled) {
        setSettingsMembers(readTeam().members);
      }
    };
    window.addEventListener('gos-settings-changed', syncLocal);
    return () => window.removeEventListener('gos-settings-changed', syncLocal);
  }, []);

  useEffect(() => {
    setTenantMember(null);
    setSettingsMembers(settingsApiEnabled ? [] : readTeam().members);
    if (!auth.user || !auth.tenant) return;

    const scope = auth.tenant.id;
    const uid = auth.user.id;

    const unsubDirect = onSnapshot(
      doc(db, 'tenants', scope, 'members', uid),
      snapshot => {
        if (snapshot.exists() && !snapshot.data()?.deleted) {
          setTenantMember(
            normalizeMemberRecord({
              id: uid,
              name: auth.user?.name ?? '',
              email: auth.user?.email ?? '',
              ...snapshot.data(),
            }),
          );
        } else {
          setTenantMember(null);
        }
      },
      () => setTenantMember(null),
    );

    const unsubSettings = onSnapshot(
      collection(db, 'settings', `team_${scope}`, 'members'),
      snapshot => {
        const list: Member[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data?.deleted) continue;
          list.push(
            normalizeMemberRecord({
              ...data,
              id: docSnap.id,
            }),
          );
        }
        setSettingsMembers(list);
      },
      () => {},
    );

    return () => {
      unsubDirect();
      unsubSettings();
    };
  }, [auth.tenant?.id, auth.user?.id, auth.user?.email, auth.user?.name]);

  const matchedMember = useMemo(() => {
    if (!auth.user) return null;
    const uid = auth.user.id;
    const emailLower = (auth.user.email || '').trim().toLowerCase();

    const fromSettings = settingsMembers.find(
      m => m.id === uid || (emailLower && m.email?.trim().toLowerCase() === emailLower),
    );
    if (fromSettings) return fromSettings;
    if (tenantMember) return tenantMember;

    // Also check local storage team fallback
    const localList = readTeam().members;
    const fromLocal = localList.find(
      m => m.id === uid || (emailLower && m.email?.trim().toLowerCase() === emailLower),
    );
    if (fromLocal) return fromLocal;

    // Fallback to session allowedTabs when logged in as a team member
    if (auth.user.isTeamMember && Array.isArray(auth.user.allowedTabs)) {
      return normalizeMemberRecord({
        id: uid,
        name: auth.user.name,
        email: auth.user.email,
        role: auth.user.teamRole || 'Member',
        isOwner: false,
        active: true,
        permissions: auth.user.allowedTabs,
        allowedModules: auth.user.allowedTabs,
      });
    }

    return null;
  }, [auth.user, settingsMembers, tenantMember]);

  // Owner Bypass: Workspace owners ALWAYS retain 100% full access to all tabs
  const isOwner = useMemo(() => {
    if (!auth.user) return false;
    if (auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN') return true;
    if (auth.user.isTeamMember) return false;
    if (matchedMember) {
      if (matchedMember.isOwner || String(matchedMember.role || '').toLowerCase() === 'owner') {
        return true;
      }
      return false;
    }
    const scope = auth.tenant?.id ?? '';
    return !scope || scope === auth.user.id || scope === `workspace-${auth.user.id}`;
  }, [auth.role, auth.tenant?.id, auth.user, matchedMember]);

  const canAccess = useCallback(
    (key: string): boolean => {
      // Workspace Owner bypass: 100% full access always
      if (isOwner) return true;
      if (!matchedMember) return true;
      if (matchedMember.active === false) return false;
      if (key === 'support') return true;

      const allowed = matchedMember.allowedModules ?? matchedMember.permissions ?? [];
      const tabMap = matchedMember.tabPermissions ?? {};

      if (allowed.includes('*')) return true;

      // Top-level 'settings' sidebar link: accessible if any settings tab is allowed
      if (key === 'settings') {
        return (
          allowed.includes('settings') ||
          allowed.some(k => k.startsWith('settings:')) ||
          Object.entries(tabMap).some(([k, v]) => k.startsWith('settings:') && Boolean(v))
        );
      }

      // Specific settings tab (e.g. 'settings:team', 'settings:billing')
      if (key.startsWith('settings:')) {
        if (tabMap[key] === true || allowed.includes(key)) return true;
        // Legacy compatibility: if 'settings' was granted without granular 'settings:*' keys
        const hasAnyGranularSettings =
          allowed.some(k => k.startsWith('settings:')) ||
          Object.keys(tabMap).some(k => k.startsWith('settings:'));
        if (!hasAnyGranularSettings && allowed.includes('settings')) return true;
        return false;
      }

      // Contacts module (with legacy 'crm' fallback if 'contacts' wasn't explicitly configured)
      if (key === 'contacts') {
        if (tabMap.contacts === true || allowed.includes('contacts')) return true;
        if (!('contacts' in tabMap) && allowed.includes('crm')) return true;
        return false;
      }

      if (tabMap[key] === true || allowed.includes(key)) return true;
      return false;
    },
    [isOwner, matchedMember],
  );

  return canAccess;
}

export function moduleForPath(path: string): string {
  const clean = path.replace(/^\/dashboard\/?/, '').replace(/^\//, '');
  const section = clean.split('/')[0] || '';
  if (section === 'marketing-tracking') return 'settings';
  if (section === 'knowledge') return 'copilot';
  if (section === 'contacts') return 'contacts';
  if (section === 'websites' || section === 'forms') return 'funnels';
  if (section === 'domains') return 'settings';
  if (section === 'integrations') return 'settings';
  if (section === 'products-payments' || section === 'products') return 'products';
  if (section === '') return 'home';
  return section;
}

export function settingsTabForPath(path: string): string | null {
  const clean = path.replace(/^\/dashboard\/?/, '').replace(/^\//, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts[0] === 'integrations') return 'settings:integrations';
  if (parts[0] === 'domains') return 'settings:domains';
  if (parts[0] === 'marketing-tracking') return 'settings:pixel';
  if (parts[0] !== 'settings') return null;

  const rawSegment = parts[1] || 'profile';
  const resolvedSlug = settingsAliases[rawSegment] ?? rawSegment;
  const known = settingsTabs.find(t => t.slug === resolvedSlug);
  return `settings:${known ? known.slug : 'profile'}`;
}

export function isTabAllowed(canAccess: (key: string) => boolean, currentPath: string): boolean {
  if (currentPath === '/dashboard/support' || currentPath.startsWith('/dashboard/support/')) {
    return true;
  }
  const settingsKey = settingsTabForPath(currentPath);
  if (settingsKey) {
    return canAccess(settingsKey);
  }
  const mod = moduleForPath(currentPath);
  return canAccess(mod);
}

export function firstAuthorizedPath(canAccess: (key: string) => boolean): string {
  for (const mod of platformModulePermissions) {
    if (canAccess(mod.id)) {
      return mod.path;
    }
  }
  for (const tab of settingsTabPermissions) {
    if (canAccess(tab.id)) {
      return tab.path;
    }
  }
  return '/dashboard/support';
}
