import { EmailAuthProvider, multiFactor, reauthenticateWithCredential, updatePassword, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { auth, backendError, db, provisionTeamMemberAuth } from './firebase';
import { store } from '../store';
import { personalPreferencesRef, profileSettingsRef, type PersonalPreferences } from './workspacePreferences';
import { showToast } from '../utils/toast';
import { buildTabPermissionsMap, modulePermissions } from '../pages/settings/localState';

export async function firebaseSettingsRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to continue.');
  try {
    if (path === '/security' && method === 'GET') return {
      sessions: [{ id: 'current', device: 'This browser', lastActive: user.metadata.lastSignInTime ?? 'Active now', current: true }],
      history: user.metadata.lastSignInTime ? [`${user.metadata.lastSignInTime} · Last Firebase sign-in`] : [], mfa: multiFactor(user).enrolledFactors.length > 0,
    } as T;
    if (path === '/security/password' && method === 'POST') {
      if (store.getState().auth.impersonation) throw new Error('Return to your own account to change your password.');
      const data = body as { currentPassword: string; newPassword: string };
      if (typeof data?.currentPassword !== 'string' || typeof data?.newPassword !== 'string'
        || !data.currentPassword || data.newPassword.length < 8 || data.currentPassword === data.newPassword) {
        throw new Error('Enter your current password and a different new password of at least 8 characters.');
      }
      if (!user.email) throw new Error('This account does not have a password sign-in.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, data.currentPassword));
      if (auth.currentUser !== user) throw new Error('The signed-in account changed.');
      // Keep Phoenix password sign-in from replacing a password managed in Upclick.
      const accountRef = doc(db, 'users', user.uid);
      if ((await getDoc(accountRef)).data()?.phoenixUid) {
        await setDoc(doc(db, 'users', user.uid, 'preferences', 'passwordPolicy'), { localPassword: true });
      }
      if (auth.currentUser !== user) throw new Error('The signed-in account changed.');
      await updatePassword(user, data.newPassword);
      return { message: 'Your sign-in password was updated.' } as T;
    }
    if (path.startsWith('/security/')) throw new Error('This security feature requires additional Firebase Authentication configuration.');
    const session = store.getState().auth;
    if (path === '/settings' && method !== 'GET' && session.impersonation && session.user?.id !== user.uid) {
      throw new Error('Sign in to your account to update these settings.');
    }
    // Use the authenticated account's tenant, never an arbitrary tenant from a request.
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const profile = userDoc.data();
    const roleUpper = String(profile?.role ?? '').toUpperCase();
    const isPlatformAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(roleUpper);

    let scope = typeof profile?.tenantId === 'string' ? profile.tenantId : '';
    if (!scope) {
      try {
        const tenantSnap = await getDoc(doc(db, 'tenants', user.uid));
        if (tenantSnap.exists()) scope = user.uid;
      } catch {
        // ignore
      }
    }
    if (!scope && isPlatformAdmin) {
      scope = 'platform';
    }
    if (!scope && profile?.status === 'Active') {
      scope = user.uid;
    }
    if (!scope && session.user?.id === user.uid) {
      scope = session.tenant?.id ?? '';
    }
    if (!scope) scope = `workspace-${user.uid}`;

    let isMember = false, hasMemberDoc = false;
    let memberRole = '';
    let memberPermissions: string[] = [];
    try {
      const [mSnap1, mSnap2] = await Promise.all([
        getDoc(doc(db, 'tenants', scope, 'members', user.uid)).catch(() => null),
        getDoc(doc(db, 'settings', `team_${scope}`, 'members', user.uid)).catch(() => null),
      ]);
      const mData = mSnap2?.exists() ? mSnap2.data() : mSnap1?.exists() ? mSnap1.data() : null;
      if (mData && !mData.deleted) {
        hasMemberDoc = true;
        isMember = mData?.active !== false;
        memberRole = String(mData?.role ?? '');
        memberPermissions = Array.isArray(mData?.allowedModules)
          ? mData.allowedModules
          : Array.isArray(mData?.permissions)
          ? mData.permissions
          : [];
      }
    } catch {
      // member check non-fatal for admins
    }

    let isTenantOwner =
      !hasMemberDoc ||
      ['Owner', 'owner'].includes(memberRole) ||
      scope === user.uid ||
      scope === `workspace-${user.uid}` ||
      scope === profile?.tenantId ||
      (session.user?.id === user.uid && scope === session.tenant?.id);
    try {
      const tenantSnap = await getDoc(doc(db, 'tenants', scope));
      if (tenantSnap.exists()) {
        const tData = tenantSnap.data();
        if (tData?.ownerUid || tData?.ownerId) {
          isTenantOwner =
            tData?.ownerUid === user.uid ||
            tData?.ownerId === user.uid ||
            profile?.ownerUid === user.uid ||
            ['Owner', 'owner'].includes(memberRole);
        }
      }
    } catch {
      // owner check non-fatal for admins
    }

    const settingsPermission =
      isPlatformAdmin ||
      isTenantOwner ||
      ['Owner', 'Admin', 'Manager', 'owner', 'admin', 'manager'].includes(memberRole) ||
      memberPermissions.includes('*') ||
      memberPermissions.includes('settings') ||
      memberPermissions.includes('settings:team');

    if (path !== '/settings' && !settingsPermission && !isMember && !isPlatformAdmin) {
      throw new Error('You do not have permission for this action.');
    }

    // Preserve compatibility with settings already saved by the former callable.
    const key = `gos-settings-v1:${scope}:${user.uid}`;
    const ref = profileSettingsRef(scope, user.uid);
    const integrations = collection(db, 'tenants', scope, 'integrations');
    if (path === '/settings') {
      if (method === 'GET') {
        const [saved, connections] = await Promise.all([
          getDoc(ref).catch(error => { if ((error as { code?: string }).code !== 'permission-denied') throw error; return null; }),
          getDocs(integrations).catch(error => {
            if ((error as { code?: string }).code !== 'permission-denied') throw error;
            return null;
          }),
        ]);
        const savedData = saved?.data()?.value ?? {};
        const connectionMap = Object.fromEntries((connections?.docs ?? []).map(item => [item.id, integrationState(item.data())]));
        return { ...savedData, integrations: connectionMap, hasSavedProfile: Boolean(savedData.profile) } as T;
      }
      if (!['PATCH', 'POST'].includes(method)) throw new Error('This settings action is not supported.');
      const data = body as { profile?: Record<string, unknown>; business?: Record<string, unknown>; payment?: Record<string, unknown>; personalPreferences?: PersonalPreferences };
      if (typeof data?.profile?.name !== 'string' || typeof data?.business?.name !== 'string') throw new Error('Enter your profile and business details.');
      const nextProfile: Record<string, unknown> = { ...data.profile, email: user.email ?? '' };
      if (typeof data.profile.email === 'string' && data.profile.email && data.profile.email !== user.email) {
        await verifyBeforeUpdateEmail(user, data.profile.email);
        showToast.info('Verify the email sent to your new address to complete the change.');
      }
      const batch = writeBatch(db);
      batch.set(ref, { key, value: { profile: nextProfile, business: data.business, ...(data.payment ? { payment: data.payment } : {}) }, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      batch.update(doc(db, 'users', user.uid), { name: nextProfile.name, ...(typeof nextProfile.photo === 'string' ? { avatar: nextProfile.photo } : {}) });
      if (data.personalPreferences && Object.keys(data.personalPreferences).length) {
        batch.set(personalPreferencesRef(user.uid), data.personalPreferences, { merge: true });
      }
      await batch.commit();
      // Firestore is authoritative: an Auth display-name refresh cannot undo a saved profile.
      try { await updateProfile(user, { displayName: nextProfile.name as string }); } catch { /* Retry on a later profile save. */ }
      return { success: true, profile: nextProfile } as T;
    }

    if (path === '/team' && method === 'GET') {
      const allModuleIds = modulePermissions.map(m => m.id);
      const mergedMap = new Map<string, Record<string, unknown>>();
      try {
        const [tenantMembers, settingsMembers] = await Promise.all([
          getDocs(collection(db, 'tenants', scope, 'members')).catch(() => null),
          getDocs(collection(db, 'settings', `team_${scope}`, 'members')).catch(() => null),
        ]);
        for (const docSnap of tenantMembers?.docs ?? []) {
          const d = docSnap.data();
          if (d?.deleted) continue;
          mergedMap.set(docSnap.id, {
            name: docSnap.id === user.uid ? profile?.name ?? user.displayName ?? '' : '',
            email: docSnap.id === user.uid ? user.email ?? '' : '',
            ...d,
            id: docSnap.id,
          });
        }
        for (const docSnap of settingsMembers?.docs ?? []) {
          const d = docSnap.data();
          if (d?.deleted) {
            mergedMap.delete(docSnap.id);
            continue;
          }
          const prev = mergedMap.get(docSnap.id) ?? {};
          mergedMap.set(docSnap.id, {
            name: docSnap.id === user.uid ? profile?.name ?? user.displayName ?? '' : '',
            email: docSnap.id === user.uid ? user.email ?? '' : '',
            ...prev,
            ...d,
            id: docSnap.id,
          });
        }
      } catch {
        // ignore read errors
      }

      // Ensure workspace owner is always present in the list
      if (isTenantOwner && !mergedMap.has(user.uid)) {
        mergedMap.set(user.uid, {
          id: user.uid,
          name: profile?.name || user.displayName || session.user?.name || user.email?.split('@')[0] || 'Workspace Owner',
          email: user.email || profile?.email || session.user?.email || '',
          role: 'Owner',
          isOwner: true,
          active: true,
          preset: 'full',
          permissions: allModuleIds,
          allowedModules: allModuleIds,
          tabPermissions: buildTabPermissionsMap(allModuleIds),
        });
      }

      // Deduplicate by email (preferring owner or most recently updated record)
      const byEmail = new Map<string, Record<string, unknown>>();
      for (const item of mergedMap.values()) {
        const em = String(item.email ?? '').trim().toLowerCase();
        const key = em || String(item.id ?? '');
        const existing = byEmail.get(key);
        if (!existing) {
          byEmail.set(key, item);
        } else {
          const itemIsOwner = item.role === 'Owner' || item.isOwner;
          const existingIsOwner = existing.role === 'Owner' || existing.isOwner;
          if (itemIsOwner && !existingIsOwner) {
            byEmail.set(key, item);
          } else if (
            !existingIsOwner &&
            String(item.updatedAt ?? '') >= String(existing.updatedAt ?? '')
          ) {
            byEmail.set(key, { ...existing, ...item });
          }
        }
      }

      const list = Array.from(byEmail.values()).sort((a, b) => {
        const aOwner = a.role === 'Owner' || a.isOwner ? 0 : 1;
        const bOwner = b.role === 'Owner' || b.isOwner ? 0 : 1;
        return aOwner - bOwner;
      });
      return { members: list } as T;
    }

    if ((path === '/team' && method === 'POST') || (/^\/team\/[^/]+$/.test(path) && (method === 'PATCH' || method === 'POST'))) {
      if (!settingsPermission) {
        throw new Error('Only workspace owners and administrators can manage team members.');
      }
      const raw = (body ?? {}) as Record<string, unknown>;
      const isUpdate = path.startsWith('/team/');
      const requestedMemberId = isUpdate
        ? decodeURIComponent(path.slice('/team/'.length))
        : String(raw.id || crypto.randomUUID());
      const name = String(raw.name || '').trim();
      const email = String(raw.email || '').trim().toLowerCase();
      const role = String(raw.role || 'Manager').trim();
      const active = raw.active !== false;
      const preset = typeof raw.preset === 'string' ? raw.preset : undefined;
      const rawPassword = typeof raw.password === 'string' ? raw.password.trim() : '';

      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Enter a valid full name and email address.');
      }

      // Check existing member doc if updating
      let existingData: Record<string, any> | null = null;
      if (isUpdate) {
        const [ex1, ex2] = await Promise.all([
          getDoc(doc(db, 'settings', `team_${scope}`, 'members', requestedMemberId)).catch(() => null),
          getDoc(doc(db, 'tenants', scope, 'members', requestedMemberId)).catch(() => null),
        ]);
        existingData = (ex1?.exists() ? ex1.data() : ex2?.exists() ? ex2.data() : null) ?? null;
      }

      const previousPassword =
        typeof existingData?.authPassword === 'string' ? existingData.authPassword.trim() : '';

      if (!isUpdate && rawPassword.length < 6) {
        throw new Error('Please enter a login password (at least 6 characters) for the team member.');
      }
      if (rawPassword && rawPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      const rawPerms = Array.isArray(raw.allowedModules)
        ? (raw.allowedModules as string[])
        : Array.isArray(raw.permissions)
        ? (raw.permissions as string[])
        : [];
      const allowedModules = [...new Set(rawPerms.filter(item => typeof item === 'string'))];
      if (allowedModules.some(p => p.startsWith('settings:')) && !allowedModules.includes('settings')) {
        allowedModules.push('settings');
      }
      const tabPermissions =
        raw.tabPermissions && typeof raw.tabPermissions === 'object'
          ? (raw.tabPermissions as Record<string, boolean>)
          : buildTabPermissionsMap(allowedModules);

      const ownerId =
        (typeof profile?.ownerId === 'string' && profile.ownerId) ||
        (typeof profile?.ownerUid === 'string' && profile.ownerUid) ||
        user.uid;
      const ownerName =
        (typeof profile?.ownerName === 'string' && profile.ownerName) ||
        (typeof profile?.name === 'string' && profile.name) ||
        user.displayName ||
        session.user?.name ||
        user.email?.split('@')[0] ||
        'Workspace Owner';
      const ownerEmail =
        (typeof profile?.ownerEmail === 'string' && profile.ownerEmail) ||
        user.email ||
        (typeof profile?.email === 'string' && profile.email) ||
        session.user?.email ||
        '';
      const tenantName =
        (typeof profile?.tenantName === 'string' && profile.tenantName) ||
        session.tenant?.name ||
        `${ownerName}'s Workspace`;

      const now = new Date().toISOString();
      const effectivePassword = rawPassword || previousPassword;
      const userProfileForMember: Record<string, unknown> = {
        name,
        email,
        role: 'USER',
        teamRole: role,
        isTeamMember: true,
        status: active ? 'Active' : 'Suspended',
        active,
        tenantId: scope,
        tenantName,
        ownerId,
        ownerName,
        ownerEmail,
        allowedTabs: allowedModules,
        allowedModules,
        tabPermissions,
        updatedAt: now,
      };

      let provisionedUid =
        typeof existingData?.authUid === 'string' && existingData.authUid
          ? existingData.authUid
          : typeof raw.authUid === 'string' && raw.authUid
          ? raw.authUid
          : '';

      if (effectivePassword) {
        try {
          const prov = await provisionTeamMemberAuth({
            email,
            password: rawPassword || undefined,
            previousPassword: previousPassword || undefined,
            displayName: name,
            userProfile: userProfileForMember,
          });
          if (prov.uid) {
            provisionedUid = prov.uid;
          }
        } catch (provErr: any) {
          const msg = String(provErr?.message || '');
          if (msg.includes('weak-password')) {
            throw new Error('Password is too weak. Please enter at least 6 characters.');
          }
          if (msg.includes('invalid-email')) {
            throw new Error('Enter a valid email address.');
          }
          // Non-fatal if secondary provisioning hits network/existing account issue
        }
      }

      const finalMemberId = provisionedUid || requestedMemberId;

      const payload: Record<string, unknown> = {
        id: finalMemberId,
        ...(provisionedUid ? { authUid: provisionedUid } : {}),
        tenantId: scope,
        tenantName,
        ownerId,
        ownerName,
        ownerEmail,
        name,
        email,
        role,
        active,
        status: active ? 'Active' : 'Inactive',
        isOwner: role.toLowerCase() === 'owner',
        ...(preset ? { preset } : {}),
        ...(effectivePassword ? { authPassword: effectivePassword, hasPassword: true } : {}),
        permissions: allowedModules,
        allowedModules,
        tabPermissions,
        updatedAt: now,
        updatedBy: user.uid,
        deleted: false,
      };

      // If member ID changed to match Firebase Auth UID, remove old placeholder doc ID
      if (requestedMemberId && requestedMemberId !== finalMemberId) {
        await deleteDoc(doc(db, 'settings', `team_${scope}`, 'members', requestedMemberId)).catch(() => null);
      }

      await setDoc(doc(db, 'settings', `team_${scope}`, 'members', finalMemberId), payload, { merge: true });

      // Write global lookup docs so resolveSession can always locate the team member's workspace & owner on login
      const emailKey = email.replace(/[^a-z0-9@._-]/g, '_');
      await Promise.all([
        setDoc(doc(db, 'settings', `teamMember_${emailKey}`), payload, { merge: true }).catch(() => null),
        provisionedUid
          ? setDoc(doc(db, 'settings', `teamMemberUid_${provisionedUid}`), payload, { merge: true }).catch(() => null)
          : Promise.resolve(null),
      ]);

      // Write audit log entry
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const actionVerb = isUpdate ? 'Updated' : 'Invited';
      const auditPayload = {
        id: auditId,
        type: 'team.member',
        description: `${actionVerb} ${name} (${email}) as ${role} (${allowedModules.filter(m => m !== 'settings').length} permissions)`,
        actorId: user.uid,
        createdAt: new Date().toLocaleString('en-GB'),
      };
      await setDoc(doc(db, 'settings', `team_${scope}`, 'auditLogs', auditId), auditPayload).catch(() => null);

      const safeMember = { ...payload };
      delete safeMember.authPassword;
      return { success: true, member: safeMember } as T;
    }

    if (/^\/team\/[^/]+$/.test(path) && method === 'DELETE') {
      if (!settingsPermission) {
        throw new Error('Only workspace owners and administrators can remove team members.');
      }
      const memberId = decodeURIComponent(path.slice('/team/'.length));
      if (memberId === user.uid && isTenantOwner) {
        throw new Error('The workspace owner cannot be removed.');
      }

      const [existingSnap1, existingSnap2] = await Promise.all([
        getDoc(doc(db, 'settings', `team_${scope}`, 'members', memberId)).catch(() => null),
        getDoc(doc(db, 'tenants', scope, 'members', memberId)).catch(() => null),
      ]);
      const existingMember = existingSnap1?.data() ?? existingSnap2?.data() ?? null;
      const memberEmail = String(existingMember?.email ?? '').trim().toLowerCase();
      const memberAuthUid = String(existingMember?.authUid ?? memberId).trim();

      await Promise.all([
        deleteDoc(doc(db, 'settings', `team_${scope}`, 'members', memberId)).catch(() =>
          setDoc(doc(db, 'settings', `team_${scope}`, 'members', memberId), { deleted: true, active: false, status: 'Inactive', updatedAt: new Date().toISOString() }, { merge: true }).catch(() => null)
        ),
        memberEmail
          ? setDoc(
              doc(db, 'settings', `teamMember_${memberEmail.replace(/[^a-z0-9@._-]/g, '_')}`),
              { deleted: true, active: false, status: 'Inactive', updatedAt: new Date().toISOString() },
              { merge: true },
            ).catch(() => null)
          : Promise.resolve(null),
        memberAuthUid
          ? setDoc(
              doc(db, 'settings', `teamMemberUid_${memberAuthUid}`),
              { deleted: true, active: false, status: 'Inactive', updatedAt: new Date().toISOString() },
              { merge: true },
            ).catch(() => null)
          : Promise.resolve(null),
      ]);

      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const auditPayload = {
        id: auditId,
        type: 'team.member.removed',
        description: `Removed team member (${existingMember?.name || memberEmail || memberId})`,
        actorId: user.uid,
        createdAt: new Date().toLocaleString('en-GB'),
      };
      await setDoc(doc(db, 'settings', `team_${scope}`, 'auditLogs', auditId), auditPayload).catch(() => null);

      return { success: true } as T;
    }

    if (path === '/team/audit' || path === '/integrations/logs') {
      try {
        const [logs1, logs2] = await Promise.all([
          getDocs(query(collection(db, 'tenants', scope, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50))).catch(() => null),
          getDocs(query(collection(db, 'settings', `team_${scope}`, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50))).catch(() => null),
        ]);
        const seen = new Set<string>();
        const entries: string[] = [];
        for (const snap of [...(logs2?.docs ?? []), ...(logs1?.docs ?? [])]) {
          if (seen.has(snap.id)) continue;
          seen.add(snap.id);
          const d = snap.data();
          entries.push(`${d.createdAt ?? ''} · ${d.description ?? d.type ?? ''}`);
        }
        return { entries } as T;
      } catch {
        return { entries: [] } as T;
      }
    }
    if (/^\/integrations\/[^/]+$/.test(path) && method === 'GET') {
      return integrationState((await getDoc(doc(integrations, path.split('/')[2]))).data() ?? {}) as T;
    }
    if (path === '/billing/recharge' && method === 'PATCH') {
      const data = body as { enabled?: boolean };
      if (data?.enabled) throw new Error('Connect a payment provider before enabling automatic recharge.');
      await setDoc(ref, { key, value: { recharge: { enabled: false, below: '', amount: '', method: '' } }, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      return { success: true } as T;
    }
    if (path === '/account') throw new Error('Contact your workspace administrator to securely delete your account and personal data.');
    throw new Error('This provider action is not configured for your workspace. Contact your workspace administrator.');
  } catch (error) {
    // Settings panels already display errors; avoid duplicate toasts and raw SDK codes.
    throw new Error(backendError(error));
  }
}

function integrationState(data: Record<string, unknown>) {
  const status = String(data.status ?? '').toUpperCase().replaceAll(' ', '_');
  return { status: status === 'CONNECTED' ? 'Connected' : status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'Not Connected', ...(typeof data.account === 'string' ? { account: data.account } : {}), ...(typeof data.problem === 'string' ? { problem: data.problem } : {}), sync: data.sync === true };
}
