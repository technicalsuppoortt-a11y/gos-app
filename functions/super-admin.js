import { createHash, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { agencyLandingWrites } from './agency-workspace.js';
import { newCommunicationWallet, PLATFORM } from './billing-engine.js';

const teamRoles = ['SUPER_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE'];
const validTabs = ['overview', 'all_admins', 'plans_billing', 'templates', 'usage_revenue', 'meta_wallet', 'team_management', 'system_settings', 'integrations', 'payments', 'logs_monitoring', 'support'];
const parseAllowedTabs = value => Array.isArray(value)
  ? [...new Set(value.map(item => String(item).trim()).filter(item => validTabs.includes(item)))]
  : null;
const zones = ['Africa/Cairo', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
const text = (value, max) => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validId = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value);
const audit = (db, writer, actor, type, fields = {}) => writer.create(db.collection('userManagementAudit').doc(), {
  actorId: actor.uid, type, createdAt: FieldValue.serverTimestamp(), ...fields,
});

export function isSuspended(profile) {
  return ['deactivated', 'inactive', 'suspended', 'deleted'].includes(String(profile?.status).toLowerCase());
}

export async function superAdminRequest(request, { actor, db, auth }) {
  const user = await actor(request);
  const role = user.role?.toUpperCase();
  const active = ['active', 'activated'].includes(String(user.status ?? 'Active').toLowerCase());
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const userTabs = Array.isArray(user.allowedTabs) ? user.allowedTabs : [];
  const hasTab = tab => isSuperAdmin || (teamRoles.includes(role) && userTabs.includes(tab));
  if (!active || (!isSuperAdmin && !teamRoles.includes(role))) {
    throw new HttpsError('permission-denied', 'Superadmin access is required.');
  }
  const input = request.data ?? {};
  switch (input.operation) {
    case 'createAdmin':
      if (!hasTab('all_admins')) throw new HttpsError('permission-denied', 'Superadmin access is required.');
      return provisionAccount(db, auth, user, input, 'ADMIN');
    case 'createMember':
      if (!hasTab('team_management')) throw new HttpsError('permission-denied', 'Superadmin access is required.');
      if (!teamRoles.includes(input.role)) throw new HttpsError('invalid-argument', 'Choose a team role.');
      return provisionAccount(db, auth, user, input, input.role);
    case 'editAdmin':
    case 'setStatus':
    case 'deleteAdmin':
      if (!hasTab('all_admins') && !hasTab('team_management')) throw new HttpsError('permission-denied', 'Superadmin access is required.');
      return changeAccount(db, auth, user, input);
    case 'saveSettings':
      if (!hasTab('system_settings')) throw new HttpsError('permission-denied', 'Superadmin access is required.');
      return saveSettings(db, user, input);
    default: throw new HttpsError('invalid-argument', 'Unknown platform operation.');
  }
}

async function provisionAccount(db, auth, user, input, role) {
  const name = text(input.name, 80), email = text(input.email, 160).toLowerCase();
  const { password, requestId } = input;
  if (!name || !isEmail(email) || typeof password !== 'string' || password.length < 8 || password.length > 128 || !validId(requestId)) {
    throw new HttpsError('invalid-argument', 'Enter a name, valid email and a password between 8 and 128 characters.');
  }
  const allowedTabs = role !== 'ADMIN' && input.allowedTabs !== undefined ? parseAllowedTabs(input.allowedTabs) : null;
  if (role !== 'ADMIN' && input.allowedTabs !== undefined && (!allowedTabs || !allowedTabs.length)) {
    throw new HttpsError('invalid-argument', 'Select at least one permitted sidebar tab.');
  }
  const id = createHash('sha256').update(`${user.uid}:${requestId}`).digest('hex');
  const ref = db.doc(`users/${id}`);
  return withAccountLock(db, id, async () => {
    const existing = (await ref.get()).data();
    if (existing && (existing.createdBy !== user.uid || existing.role !== role || existing.email !== email || existing.name !== name || isSuspended(existing))) {
      throw new HttpsError('already-exists', 'This account request was already used.');
    }
    const tenantId = role === 'ADMIN' ? `workspace-${id}` : 'platform';
    const agencyId = role === 'ADMIN' ? `agency-${id}` : '';
    if (!existing) {
      await createDisabledIdentity(auth, { uid: id, email, password, displayName: name });
      await auth.setCustomUserClaims(id, { role, ...(role === 'ADMIN' ? { tenantId } : {}), ...(allowedTabs ? { allowedTabs } : {}) });
      if (agencyId) {
        await createDisabledIdentity(auth, { uid: agencyId, displayName: name });
        await auth.setCustomUserClaims(agencyId, { role: 'USER', tenantId: `workspace-${agencyId}`, accountType: 'agency' });
      }
      const now = new Date().toISOString();
      const batch = db.batch();
      const base = { name, status: 'Active', created: now, activatedAt: now, createdBy: user.uid };
      batch.create(ref, { ...base, id, email, role, tenantId, ...(agencyId ? { defaultAgencyUserId: agencyId, supportParentId: user.uid } : { platformTeamOwnerId: user.uid, ...(allowedTabs ? { allowedTabs } : {}) }) });
      if (agencyId) {
        const agencyTenantId = `workspace-${agencyId}`;
        const tenantName = `${name}'s Agency workspace`;
        batch.create(db.doc(`users/${agencyId}`), { ...base, id: agencyId, contactEmail: email, role: 'USER', tenantId: agencyTenantId, tenantName, accountType: 'agency', defaultAgencyFor: id, createdBy: id, supportParentId: id, billingOwnerId: id });
        const root = db.doc(`tenants/${agencyTenantId}`);
        createWorkspace(batch, db.doc(`tenants/${tenantId}`), id, name, email, `${name}'s workspace`);
        createWorkspace(batch, root, agencyId, name, email, tenantName, { accountType: 'agency', billingOwnerId: id, agencyLandingSeeded: true });
        batch.create(db.doc(`billingWallets/${id}`), { id, ownerId: id, role, providerId: PLATFORM, balance: 0, createdAt: now, updatedAt: now });
        batch.create(db.doc(`communicationWallets/${id}`), newCommunicationWallet(id, role, PLATFORM, now));
        for (const [asset, value] of agencyLandingWrites(root, id, now, input.language)) batch.create(asset, value);
      }
      audit(db, batch, user, agencyId ? 'admin.created' : 'team.created', { userId: id, role, ...(agencyId ? { agencyUserId: agencyId } : {}) });
      await batch.commit();
    }
    if (agencyId) await auth.updateUser(agencyId, { disabled: false });
    await auth.updateUser(id, { disabled: false });
    return { id };
  });
}

async function createDisabledIdentity(auth, values) {
  try { await auth.createUser({ ...values, disabled: true }); }
  catch (error) {
    if (['auth/uid-already-exists', 'auth/email-already-exists'].includes(error.code)) {
      const existing = await auth.getUser(values.uid).catch(e => { if (e.code !== 'auth/user-not-found') throw e; });
      if (existing?.disabled && existing.email === values.email) {
        await auth.updateUser(values.uid, values);
        return;
      }
      throw new HttpsError('already-exists', 'This email already has an account.');
    }
    throw error;
  }
}

function createWorkspace(batch, root, uid, name, email, workspaceName, extra = {}) {
  batch.create(root, { name: workspaceName, ownerId: uid, ...extra });
  batch.create(root.collection('members').doc(uid), { name, email, role: 'Owner', status: 'Active', active: true, permissions: ['*'] });
}

async function withAccountLock(db, id, action) {
  const ref = db.doc(`platformAccountLocks/${id}`), token = randomUUID();
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (current?.expiresAt > Date.now()) throw new HttpsError('aborted', 'Another account update is in progress. Try again shortly.');
    tx.set(ref, { token, expiresAt: Date.now() + 120000 });
  });
  try { return await action(); }
  finally {
    await db.runTransaction(async tx => { if ((await tx.get(ref)).data()?.token === token) tx.delete(ref); })
      .catch(error => console.error('Platform account lock release failed', error.code));
  }
}

async function changeAccount(db, auth, user, input) {
  const { id, operation } = input;
  if (!validId(id) || id === user.uid) throw new HttpsError('invalid-argument', 'Choose a different account.');
  return withAccountLock(db, id, async () => {
    const ref = db.doc(`users/${id}`), target = (await ref.get()).data();
    const admin = ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'].includes(target?.role?.toUpperCase());
    const teamMember = teamRoles.includes(target?.role);
    const limitedTeamMember = ['PLATFORM_SUPPORT', 'PLATFORM_FINANCE'].includes(target?.role);
    if (!target || (!admin && !((operation === 'setStatus' || operation === 'deleteAdmin') && limitedTeamMember) && !(operation === 'editAdmin' && teamMember))) throw new HttpsError('permission-denied', 'This account cannot be managed here.');
    if (target.deletedAt && operation !== 'deleteAdmin') throw new HttpsError('failed-precondition', 'This account was deleted.');
    const linkedId = target.defaultAgencyUserId;
    const linkedRef = validId(linkedId) ? db.doc(`users/${linkedId}`) : null;
    const linked = linkedRef ? (await linkedRef.get()).data() : null;
    const accounts = [[ref, target], ...(linked?.defaultAgencyFor === id ? [[linkedRef, linked]] : [])];
    const batch = db.batch();
    if (operation === 'editAdmin') {
      const name = text(input.name, 80), email = text(input.email, 160).toLowerCase();
      if (!name || !isEmail(email)) throw new HttpsError('invalid-argument', 'Enter a name and valid email.');
      const nextRole = teamMember && input.role ? (teamRoles.includes(input.role) ? input.role : null) : target.role;
      if (!nextRole) throw new HttpsError('invalid-argument', 'Choose a team role.');
      const allowedTabs = teamMember && input.allowedTabs !== undefined ? parseAllowedTabs(input.allowedTabs) : undefined;
      if (allowedTabs !== undefined && (!allowedTabs || !allowedTabs.length)) {
        throw new HttpsError('invalid-argument', 'Select at least one permitted sidebar tab.');
      }
      try { await auth.updateUser(id, { displayName: name, ...(email !== target.email ? { email, emailVerified: false } : {}) }); }
      catch (error) {
        if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'This email already has an account.');
        throw error;
      }
      if (teamMember && (nextRole !== target.role || allowedTabs !== undefined)) {
        const finalTabs = allowedTabs ?? target.allowedTabs;
        await auth.setCustomUserClaims(id, { role: nextRole, ...(Array.isArray(finalTabs) ? { allowedTabs: finalTabs } : {}) });
      }
      batch.update(ref, {
        name,
        email,
        ...(teamMember && nextRole ? { role: nextRole } : {}),
        ...(allowedTabs ? { allowedTabs } : {}),
      });
      if (accounts.length > 1) batch.update(linkedRef, { name, contactEmail: email });
    } else {
      const deleting = operation === 'deleteAdmin';
      if (!deleting && typeof input.active !== 'boolean') throw new HttpsError('invalid-argument', 'Choose an account status.');
      const active = !deleting && input.active;
      if (target.deletedAt) return { id };
      const status = active ? 'Active' : 'Deactivated';
      // Deny access with the profile and membership before disabling credentials.
      for (const [accountRef, account] of accounts) {
        batch.update(accountRef, { status });
        if (validId(account.tenantId) && account.tenantId !== 'platform') {
          const member = db.doc(`tenants/${account.tenantId}/members/${accountRef.id}`);
          if ((await member.get()).exists) batch.update(member, { status, active });
        }
      }
      if (active) {
        for (const [accountRef] of [...accounts].reverse()) await auth.updateUser(accountRef.id, { disabled: false });
      } else {
        await batch.commit();
        for (const [accountRef] of accounts) {
          try {
            if (deleting) await auth.deleteUser(accountRef.id);
            else { await auth.updateUser(accountRef.id, { disabled: true }); await auth.revokeRefreshTokens(accountRef.id); }
          } catch (error) { if (!deleting || error.code !== 'auth/user-not-found') throw error; }
        }
        await db.runTransaction(async tx => {
          if (deleting) {
            const subscription = db.doc(`billingSubscriptions/${id}`);
            const previous = (await tx.get(subscription)).data();
            if (['active', 'trialing'].includes(previous?.status)) tx.update(subscription, { status: 'cancelled', updatedAt: new Date().toISOString() });
            for (const [accountRef, account] of accounts) tx.set(accountRef, { role: account.role, status: 'Deleted', deletedAt: FieldValue.serverTimestamp() });
          }
          audit(db, tx, user, deleting ? 'admin.deleted' : 'account.suspended', { userId: id, severity: 'Warning' });
        });
        return { id };
      }
    }
    audit(db, batch, user, operation === 'editAdmin' ? 'admin.edited' : 'account.activated', { userId: id });
    await batch.commit();
    return { id };
  });
}

async function saveSettings(db, user, { settings, revision }) {
  const name = text(settings?.name, 60), email = text(settings?.email, 160).toLowerCase();
  const { timezone, trialDays, registrations, maintenance, mfa, alerts } = settings ?? {};
  if (!name || !isEmail(email) || !zones.includes(timezone) || !Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90 ||
      ![registrations, maintenance, mfa, alerts].every(value => typeof value === 'boolean')) {
    throw new HttpsError('invalid-argument', 'Check the platform settings and try again.');
  }
  const ref = db.doc('settings/platformOperations');
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data()?.revision ?? 0;
    if (revision !== current) throw new HttpsError('aborted', 'Settings changed in another session. Discard your draft to load the latest settings.');
    tx.set(ref, { name, email, timezone, trialDays, registrations, maintenance, mfa, alerts, revision: current + 1, updatedBy: user.uid, updatedAt: FieldValue.serverTimestamp() });
    audit(db, tx, user, 'platform.settings_updated');
  });
  return { success: true };
}
