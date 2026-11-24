import { createHash, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { agencyLandingWrites } from './agency-workspace.js';
import {
  addDays,
  CHANNEL_IDS,
  DEFAULT_TRIAL,
  newCommunicationWallet,
  planSnapshot,
  PLATFORM,
  TOOL_IDS,
} from './billing-engine.js';

const cleanText = (value, max) =>
  typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validId = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value);

async function withSignupLock(db, id, action) {
  const ref = db.doc(`platformAccountLocks/${id}`);
  const token = randomUUID();
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (current?.expiresAt > Date.now()) {
      throw new HttpsError('aborted', 'Another signup request is in progress. Please try again shortly.');
    }
    tx.set(ref, { token, expiresAt: Date.now() + 120000 });
  });
  try {
    return await action();
  } finally {
    await db
      .runTransaction(async tx => {
        if ((await tx.get(ref)).data()?.token === token) tx.delete(ref);
      })
      .catch(() => null);
  }
}

async function createDisabledAuthUser(auth, values) {
  try {
    await auth.createUser({ ...values, disabled: true });
  } catch (error) {
    if (['auth/uid-already-exists', 'auth/email-already-exists'].includes(error?.code)) {
      const existing = await auth.getUser(values.uid).catch(err => {
        if (err?.code !== 'auth/user-not-found') throw err;
        return null;
      });
      if (existing?.disabled && existing.email === values.email) {
        await auth.updateUser(values.uid, values);
        return;
      }
      throw new HttpsError('already-exists', 'This email already has an account.');
    }
    throw error;
  }
}

function resolveAdminTrialPlan(configuredTrial, opsSettings) {
  if (configuredTrial && configuredTrial.enabled === false) {
    throw new HttpsError('failed-precondition', 'Free trial registrations are currently paused.');
  }
  if (configuredTrial && configuredTrial.status === 'active') {
    const durationDays = Math.max(1, Math.min(365, Number(configuredTrial.durationDays) || 14));
    const aiCredits = Math.max(0, Number(configuredTrial.aiCredits ?? configuredTrial.credits ?? DEFAULT_TRIAL.admin.credits));
    const emailCredits = Math.max(0, Number(configuredTrial.emailCredits ?? 500));
    return {
      ...configuredTrial,
      id: configuredTrial.id || `${PLATFORM}__trial`,
      kind: 'trial',
      billingType: 'fixed',
      durationDays,
      price: 0,
      currency: configuredTrial.currency || 'USD',
      credits: aiCredits,
      aiCredits,
      emailCredits,
      tools: Array.isArray(configuredTrial.tools) && configuredTrial.tools.length ? configuredTrial.tools : [...TOOL_IDS],
      channels: Array.isArray(configuredTrial.channels) && configuredTrial.channels.length ? configuredTrial.channels : [...CHANNEL_IDS],
      limits: configuredTrial.limits || { seats: 3, clients: 10 },
    };
  }

  const defaultDays = Number.isInteger(opsSettings?.trialDays) && opsSettings.trialDays >= 1 && opsSettings.trialDays <= 90
    ? opsSettings.trialDays
    : 14;
  const aiCredits = DEFAULT_TRIAL.admin.credits;
  return {
    id: `${PLATFORM}__trial`,
    ownerId: PLATFORM,
    audience: 'admin',
    kind: 'trial',
    name: { en: 'Admin Free Trial', ar: 'التجربة المجانية لحساب المدير' },
    description: {
      en: 'Complimentary Admin & White-Label trial workspace',
      ar: 'فترة تجريبية مجانية لحساب المدير ومنصة العلامة البيضاء',
    },
    badge: { en: 'Free Trial', ar: 'تجربة مجانية' },
    cta: { en: 'Start Now', ar: 'ابدأ الآن' },
    features: {
      en: ['All 12 AI & business tools', 'Full White-Label brand studio', 'Starter AI credits included'],
      ar: ['جميع أدوات الأعمال والذكاء الاصطناعي الـ 12', 'استوديو العلامة البيضاء المتكامل', 'رصيد ذكاء اصطناعي ترحيبي متضمن'],
    },
    price: 0,
    currency: 'USD',
    billingType: 'fixed',
    durationDays: defaultDays,
    credits: aiCredits,
    aiCredits,
    emailCredits: 500,
    tools: [...TOOL_IDS],
    channels: [...CHANNEL_IDS],
    limits: { seats: 3, clients: 10 },
    visible: true,
    enabled: true,
    status: 'active',
  };
}

/**
 * Public callable for the Landing Page "Start Now" special-case Admin Free Trial onboarding flow.
 * Provisions an isolated Admin account, its linked Agency workspace, and an active Free Trial subscription.
 */
export async function registerTrialAdminRequest(request, { db, auth }) {
  const input = request?.data ?? {};
  const name = cleanText(input.name, 80);
  const workspaceName = cleanText(input.workspaceName, 80);
  const email = cleanText(input.email, 160).toLowerCase();
  const phone = cleanText(input.phone ?? '', 32);
  const password = input.password;
  const requestId = input.requestId;
  const acceptTrialTerms = input.acceptTrialTerms === true;
  const rawLang = typeof input.language === 'string' ? input.language.toLowerCase() : 'en';
  const brandLang = rawLang === 'ar' ? 'ar' : 'en';

  if (name.length < 2) {
    throw new HttpsError('invalid-argument', 'Enter your full name (at least 2 characters).');
  }
  if (workspaceName.length < 2) {
    throw new HttpsError('invalid-argument', 'Enter your company or brand name (at least 2 characters).');
  }
  if (!isEmail(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid work email address.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new HttpsError('invalid-argument', 'Enter a password between 8 and 128 characters.');
  }
  if (!acceptTrialTerms) {
    throw new HttpsError('invalid-argument', 'Accept the Free Trial terms to continue.');
  }
  if (!validId(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid signup request token is required.');
  }

  const [opsSnap, trialSnap] = await Promise.all([
    db.doc('settings/platformOperations').get(),
    db.doc(`billingPlans/${PLATFORM}__trial`).get(),
  ]);
  const ops = opsSnap.exists ? opsSnap.data() : null;
  if (ops && (ops.maintenance === true || ops.registrations === false)) {
    throw new HttpsError('failed-precondition', 'New trial registrations are temporarily paused.');
  }
  const trialPlan = resolveAdminTrialPlan(trialSnap.exists ? trialSnap.data() : null, ops);

  const id = createHash('sha256').update(`public-admin-trial:${requestId}`).digest('hex').slice(0, 28);
  const ref = db.doc(`users/${id}`);

  return withSignupLock(db, id, async () => {
    const existing = (await ref.get()).data();
    if (existing) {
      if (existing.email !== email || existing.role !== 'ADMIN' || existing.signupSource !== 'landing_free_trial') {
        throw new HttpsError('already-exists', 'This signup request token was already used.');
      }
      await auth.updateUser(`agency-${id}`, { disabled: false }).catch(() => null);
      await auth.updateUser(id, { disabled: false });
      return {
        id,
        tenantId: existing.tenantId,
        trialDays: trialPlan.durationDays,
        credits: trialPlan.aiCredits,
        status: 'trialing',
      };
    }

    const tenantId = `workspace-${id}`;
    const agencyId = `agency-${id}`;
    const agencyTenantId = `workspace-${agencyId}`;

    await createDisabledAuthUser(auth, { uid: id, email, password, displayName: name });
    try {
      await auth.setCustomUserClaims(id, { role: 'ADMIN', tenantId });
      await createDisabledAuthUser(auth, { uid: agencyId, displayName: name });
      await auth.setCustomUserClaims(agencyId, {
        role: 'USER',
        tenantId: agencyTenantId,
        accountType: 'agency',
      });

      const now = new Date().toISOString();
      const periodEnd = addDays(now, trialPlan.durationDays);
      const cycleEnd = addDays(now, Math.min(30, trialPlan.durationDays));
      const ledgerId = db.collection('billingLedger').doc().id;
      const batch = db.batch();

      batch.create(ref, {
        id,
        name,
        email,
        ...(phone ? { phone } : {}),
        role: 'ADMIN',
        status: 'Active',
        created: now,
        activatedAt: now,
        createdBy: id,
        tenantId,
        tenantName: workspaceName,
        defaultAgencyUserId: agencyId,
        supportParentId: PLATFORM,
        signupSource: 'landing_free_trial',
      });

      const agencyWorkspaceTitle = `${workspaceName} Agency`;
      batch.create(db.doc(`users/${agencyId}`), {
        id: agencyId,
        name,
        contactEmail: email,
        role: 'USER',
        status: 'Active',
        created: now,
        activatedAt: now,
        createdBy: id,
        tenantId: agencyTenantId,
        tenantName: agencyWorkspaceTitle,
        accountType: 'agency',
        defaultAgencyFor: id,
        supportParentId: id,
        billingOwnerId: id,
      });

      const adminTenantRef = db.doc(`tenants/${tenantId}`);
      batch.create(adminTenantRef, { name: workspaceName, ownerId: id });
      batch.create(adminTenantRef.collection('members').doc(id), {
        name,
        email,
        role: 'Owner',
        status: 'Active',
        active: true,
        permissions: ['*'],
      });

      const agencyTenantRef = db.doc(`tenants/${agencyTenantId}`);
      batch.create(agencyTenantRef, {
        name: agencyWorkspaceTitle,
        ownerId: agencyId,
        accountType: 'agency',
        billingOwnerId: id,
        agencyLandingSeeded: true,
      });
      batch.create(agencyTenantRef.collection('members').doc(agencyId), {
        name,
        email,
        role: 'Owner',
        status: 'Active',
        active: true,
        permissions: ['*'],
      });

      batch.create(db.doc(`dashboardBrands/${id}`), {
        values: {
          name: workspaceName,
          logoUrl: '/upclick-logo.svg',
          theme: 'violet',
          language: brandLang,
          mode: 'system',
        },
        updatedBy: id,
        updatedAt: now,
      });

      batch.create(db.doc(`billingWallets/${id}`), {
        id,
        ownerId: id,
        role: 'ADMIN',
        providerId: PLATFORM,
        balance: trialPlan.aiCredits,
        aiCredits: trialPlan.aiCredits,
        emailCredits: trialPlan.emailCredits,
        lifetimeGranted: trialPlan.aiCredits,
        lifetimeConsumed: 0,
        createdAt: now,
        updatedAt: now,
      });

      batch.create(db.doc(`communicationWallets/${id}`), newCommunicationWallet(id, 'ADMIN', PLATFORM, now));

      batch.create(db.doc(`billingSubscriptions/${id}`), {
        id,
        subscriberId: id,
        subscriberRole: 'ADMIN',
        subscriberName: name,
        subscriberEmail: email,
        providerId: PLATFORM,
        planId: trialPlan.id,
        plan: planSnapshot(trialPlan),
        status: 'trialing',
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditCycleStart: now,
        creditCycleEnd: cycleEnd,
        trialUsedAt: now,
        specialCaseFlow: 'landing_admin_trial',
        autoRenew: false,
        extraSeats: 0,
        extraTools: [],
        renewals: 0,
        creditBlocked: false,
        createdAt: now,
      });

      batch.create(db.doc(`billingLedger/${ledgerId}`), {
        id: ledgerId,
        walletId: id,
        providerId: PLATFORM,
        type: 'grant',
        bucket: 'ai',
        amount: trialPlan.aiCredits,
        balanceAfter: trialPlan.aiCredits,
        emailAmount: trialPlan.emailCredits,
        emailBalanceAfter: trialPlan.emailCredits,
        description: `Free trial credits · ${trialPlan.name.en}`,
        refType: 'trial',
        refId: trialPlan.id,
        actorId: id,
        createdAt: now,
      });

      for (const [assetRef, assetValue] of agencyLandingWrites(agencyTenantRef, id, now, brandLang)) {
        batch.create(assetRef, assetValue);
      }

      batch.create(db.collection('userManagementAudit').doc(), {
        actorId: id,
        userId: id,
        agencyUserId: agencyId,
        role: 'ADMIN',
        type: 'admin.trial_registered',
        workspaceName,
        trialDays: trialPlan.durationDays,
        createdAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      await auth.deleteUser(agencyId).catch(() => null);
      await auth.deleteUser(id).catch(() => null);
      throw error;
    }

    await auth.updateUser(agencyId, { disabled: false });
    await auth.updateUser(id, { disabled: false });
    return {
      id,
      tenantId,
      trialDays: trialPlan.durationDays,
      credits: trialPlan.aiCredits,
      status: 'trialing',
    };
  });
}
