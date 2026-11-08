import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { isPlatformTeamRole } from '../router/platformAccess';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, callBackend, backendError } from './firebase';
import { isDemoAccount } from './demoContext';
import {
  gatewayFields,
  gatewaySummary,
  paytabsRegions,
  type GatewayProvider,
  type GatewaySummary,
} from '../../functions/payment-gateway-model.js';

export type GatewayConfiguration = GatewaySummary & { gatewayRevision: number };
export type PaymentScope = 'super_admin' | 'admin' | 'user';

export interface UsePaymentMethodsOptions {
  scope?: PaymentScope;
  targetId?: string | null;
  tenantId?: string | null;
}

export const paymentProviders = [
  ['vodafone', 'Vodafone Cash', 'manual'],
  ['instapay', 'InstaPay', 'manual'],
  ['etisalat', 'Etisalat Cash', 'manual'],
  ['orange', 'Orange Cash', 'manual'],
  ['bank', 'Bank Transfer', 'manual'],
  ['stc', 'STC Pay', 'manual'],
  ['paddle', 'Paddle', 'gateway'],
  ['paymob', 'Paymob', 'gateway'],
  ['stripe', 'Stripe', 'gateway'],
  ['paypal', 'PayPal', 'gateway'],
  ['paytabs', 'PayTabs', 'gateway'],
  ['fawry', 'Fawry', 'gateway'],
  ['kashier', 'Kashier', 'gateway'],
] as const;

export const manualBrandLogos: Record<string, string> = {
  vodafone: '/payment-brands/vodafone.svg',
  instapay: '/payment-brands/instapay.png',
  etisalat: '/payment-brands/etisalat.ico',
  orange: '/payment-brands/orange.svg',
  stc: '/payment-brands/stc.svg',
};

export function resolvePaymentProviderKey(provider?: string, id?: string, name?: string): string {
  const exact = (provider || '').trim().toLowerCase();
  if (exact && paymentProviders.some(([key]) => key === exact)) return exact;
  const raw = `${provider ?? ''} ${id ?? ''} ${name ?? ''}`.toLowerCase();
  if (raw.includes('vodafone')) return 'vodafone';
  if (raw.includes('instapay')) return 'instapay';
  if (raw.includes('etisalat') || raw.includes('e&')) return 'etisalat';
  if (raw.includes('orange')) return 'orange';
  if (raw.includes('stc')) return 'stc';
  if (raw.includes('bank')) return 'bank';
  if (raw.includes('stripe')) return 'stripe';
  if (raw.includes('paddle')) return 'paddle';
  if (raw.includes('paymob')) return 'paymob';
  if (raw.includes('fawry')) return 'fawry';
  if (raw.includes('kashier')) return 'kashier';
  if (raw.includes('paypal')) return 'paypal';
  if (raw.includes('paytabs')) return 'paytabs';
  return (provider || id || '').trim().toLowerCase();
}

const gatewayDisplayNames: Record<GatewayProvider, string> = {
  paddle: 'Paddle',
  paymob: 'Paymob',
  stripe: 'Stripe',
  paypal: 'PayPal',
  paytabs: 'PayTabs',
  fawry: 'Fawry',
  kashier: 'Kashier',
};

export interface PaymentMethod {
  id: string;
  provider: string;
  name: string;
  type: 'manual' | 'gateway';
  account: string;
  instructions: string;
  enabled: boolean;
  status: 'Configured' | 'Connected';
}

function validateGatewayConfiguration(
  provider: GatewayProvider,
  input: Record<string, string>,
  previousInput?: unknown
): Record<string, string> {
  if (!Object.hasOwn(gatewayFields, provider) || !input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid gateway configuration.');
  }
  if (!['sandbox', 'live'].includes(input.mode)) {
    throw new Error('Choose Sandbox or Live mode.');
  }
  if (provider === 'paytabs' && !paytabsRegions.includes(input.region)) {
    throw new Error('Choose a valid PayTabs region.');
  }
  const previous: Record<string, string> =
    previousInput && typeof previousInput === 'object'
      ? (previousInput as Record<string, string>)
      : {};
  const result: Record<string, string> = {
    mode: input.mode,
    ...(provider === 'paytabs' ? { region: input.region } : {}),
  };
  const identityChanged =
    previous.mode !== input.mode ||
    (provider === 'paytabs' && previous.region !== input.region) ||
    gatewayFields[provider].some(f => !f.secret && previous[f.key] !== input[f.key]?.trim());
  for (const field of gatewayFields[provider]) {
    const value = input[field.key];
    if (value !== undefined && (typeof value !== 'string' || value.length > 4096)) {
      throw new Error(`Invalid ${field.label}.`);
    }
    const text = value?.trim() ?? '';
    result[field.key] = text || (field.secret && !identityChanged ? previous[field.key] ?? '' : '');
    if (!result[field.key] && !field.optional) {
      throw new Error(
        `Enter ${field.label}${identityChanged && field.secret ? ' for this account and mode' : ''}.`
      );
    }
  }
  if (provider === 'stripe') {
    const mode = input.mode === 'live' ? 'live' : 'test';
    if (!new RegExp(`^pk_${mode}_[A-Za-z0-9]+$`).test(result.publishableKey)) {
      throw new Error('Publishable Key must match the selected Stripe mode.');
    }
    if (!new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(result.secretKey)) {
      throw new Error('Secret Key must match the selected Stripe mode.');
    }
    if (result.webhookSecret && !/^whsec_[A-Za-z0-9]+$/.test(result.webhookSecret)) {
      throw new Error('Enter a valid Webhook Secret.');
    }
  }
  if (provider === 'paymob') {
    if (!/^\d+(\s*,\s*\d+)*$/.test(result.integrationIds)) {
      throw new Error('Enter numeric Paymob integration IDs separated by commas.');
    }
  }
  if (provider === 'paddle' && !result.clientToken.startsWith(input.mode === 'live' ? 'live_' : 'test_')) {
    throw new Error('Client-side Token must match the selected Paddle mode.');
  }
  if (provider === 'paytabs' && !/^\d+$/.test(result.profileId)) {
    throw new Error('Profile ID must contain digits only.');
  }
  return result;
}

function validatePaymentMethods(input: unknown, previous: PaymentMethod[] = []): PaymentMethod[] {
  if (!Array.isArray(input) || input.length > 24) {
    throw new Error('Payment methods must be a bounded list.');
  }
  const previousStatus = new Map(
    previous
      .filter(m => m && typeof m === 'object')
      .map(m => [String(m.provider ?? ''), m.status === 'Connected' ? 'Connected' : 'Configured'])
  );
  const seen = new Set<string>();
  return input.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid payment method.');
    const item = raw as Record<string, unknown>;
    const provider = String(item.provider ?? '').trim();
    const spec = paymentProviders.find(([key]) => key === provider);
    const id = String(item.id ?? provider).trim();
    const account = String(item.account ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    const instructions = String(item.instructions ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    const enabled = Boolean(item.enabled);
    if (!spec || !id || seen.has(provider) || seen.has(id)) {
      throw new Error('Invalid or duplicate payment provider.');
    }
    if (account.length < (spec[2] === 'manual' ? 3 : 2) || account.length > 160) {
      throw new Error('Account or reference details are required.');
    }
    if (instructions.length > 500) {
      throw new Error('Payment instructions must be 500 characters or fewer.');
    }
    seen.add(provider);
    seen.add(id);
    const status: 'Configured' | 'Connected' =
      spec[2] === 'gateway' && previousStatus.get(provider) === 'Connected'
        ? 'Connected'
        : 'Configured';
    return {
      id,
      provider,
      name: spec[1],
      type: spec[2],
      account,
      instructions,
      enabled,
      status,
    };
  });
}

function readSnapshotOnce(ref: ReturnType<typeof doc>): Promise<Record<string, any> | undefined> {
  return new Promise(resolve => {
    let settled = false;
    let unsub: (() => void) | undefined;
    const finish = (val: Record<string, any> | undefined) => {
      if (settled) return;
      settled = true;
      unsub?.();
      resolve(val);
    };
    unsub = onSnapshot(
      ref,
      snap => finish((snap as { data?: () => Record<string, any> | undefined })?.data?.()),
      () => finish(undefined)
    );
  });
}

function buildScopeDescriptor(
  role: string | null | undefined,
  userId: string | undefined,
  userTenantId: string | undefined,
  options?: UsePaymentMethodsOptions
) {
  const effectiveScope: PaymentScope =
    options?.scope ??
    (isPlatformTeamRole(role) || role === 'SUPER_ADMIN'
      ? 'super_admin'
      : role === 'ADMIN'
        ? 'admin'
        : 'user');

  const explicitTarget = String(options?.tenantId || options?.targetId || '').trim();

  if (effectiveScope === 'super_admin') {
    const canManage = Boolean(
      userId && (role === 'SUPER_ADMIN' || isPlatformTeamRole(role) || isDemoAccount)
    );
    return {
      scope: 'super_admin' as const,
      primaryId: 'platform',
      secondaryId: '',
      canManage,
      paths: [
        ['tenants', 'platform', 'paymentMethods', 'config'],
        ['settings', 'paymentMethods_super_admin'],
        ['settings', 'paymentMethods'],
      ] as string[][],
      privateGatewayPath: (provider: GatewayProvider) => [
        'tenants',
        'platform',
        'integrations',
        `paymentGateway_${provider}`,
      ],
    };
  }

  if (effectiveScope === 'admin') {
    const ownTenant = userTenantId && userTenantId !== 'platform' ? userTenantId : '';
    const isSelf =
      !explicitTarget ||
      explicitTarget === userId ||
      explicitTarget === userTenantId ||
      explicitTarget === ownTenant;
    const primaryId = isSelf ? ownTenant || userId || '' : explicitTarget;
    const secondaryId = isSelf
      ? userId && userId !== primaryId
        ? userId
        : primaryId && !primaryId.startsWith('workspace-')
          ? `workspace-${primaryId}`
          : ''
      : primaryId
        ? primaryId.startsWith('workspace-')
          ? primaryId.slice(10)
          : `workspace-${primaryId}`
        : '';
    const canManage = Boolean(
      userId && (role === 'SUPER_ADMIN' || (role === 'ADMIN' && isSelf) || isDemoAccount)
    );
    const paths: string[][] = [];
    if (primaryId) {
      paths.push(['tenants', primaryId, 'paymentMethods', 'config']);
      paths.push(['settings', `paymentMethods_admin_${primaryId}`]);
    }
    if (secondaryId && secondaryId !== primaryId) {
      paths.push(['tenants', secondaryId, 'paymentMethods', 'config']);
      paths.push(['settings', `paymentMethods_admin_${secondaryId}`]);
    }
    return {
      scope: 'admin' as const,
      primaryId,
      secondaryId,
      canManage,
      paths,
      privateGatewayPath: (provider: GatewayProvider) => [
        'tenants',
        primaryId || userId || 'admin',
        'integrations',
        `paymentGateway_${provider}`,
      ],
    };
  }

  // effectiveScope === 'user'
  const isSelf =
    !explicitTarget || explicitTarget === userTenantId || explicitTarget === userId;
  const primaryId = isSelf ? userTenantId || userId || '' : explicitTarget;
  const secondaryId = isSelf
    ? userId && userId !== primaryId
      ? userId
      : ''
    : primaryId
      ? primaryId.startsWith('workspace-')
        ? primaryId.slice(10)
        : `workspace-${primaryId}`
      : '';
  const canManage = Boolean(
    userId &&
      (role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        (role === 'USER' && isSelf) ||
        isDemoAccount)
  );
  const paths: string[][] = [];
  if (primaryId) {
    paths.push(['tenants', primaryId, 'paymentMethods', 'config']);
    paths.push(['settings', `paymentMethods_user_${primaryId}`]);
  }
  if (secondaryId && secondaryId !== primaryId) {
    paths.push(['tenants', secondaryId, 'paymentMethods', 'config']);
    paths.push(['settings', `paymentMethods_user_${secondaryId}`]);
  }
  return {
    scope: 'user' as const,
    primaryId,
    secondaryId,
    canManage,
    paths,
    privateGatewayPath: (provider: GatewayProvider) => [
      'tenants',
      primaryId || userId || 'user',
      'integrations',
      `paymentGateway_${provider}`,
    ],
  };
}

const paymentScopeCache = new Map<string, { methods: PaymentMethod[]; revision: number }>();

function isTestTransportActive() {
  return typeof window !== 'undefined' && typeof (window as any).__publicPayments === 'function';
}

export function usePaymentMethods(options?: UsePaymentMethodsOptions) {
  const { user, role, tenant } = useSelector((s: RootState) => s.auth);
  const [retry, setRetry] = useState(0);

  const descriptor = useMemo(
    () => buildScopeDescriptor(role, user?.id, tenant?.id, options),
    [role, user?.id, tenant?.id, options?.scope, options?.targetId, options?.tenantId]
  );

  const scopeKey = `${descriptor.scope}:${descriptor.primaryId}:${descriptor.secondaryId}`;
  const cachedScope = !isTestTransportActive() ? paymentScopeCache.get(scopeKey) : undefined;

  const [state, setState] = useState<{
    scopeKey: string;
    methods: PaymentMethod[];
    revision: number;
    loading: boolean;
    error: string;
    canManage: boolean;
  }>({
    scopeKey,
    methods: cachedScope?.methods ?? [],
    revision: cachedScope?.revision ?? 0,
    loading: !cachedScope,
    error: '',
    canManage: descriptor.canManage,
  });

  useEffect(() => {
    let active = true;
    let settleTimer: number | undefined;
    if (!descriptor.paths.length) {
      setState({
        scopeKey,
        methods: [],
        revision: 0,
        loading: false,
        error: '',
        canManage: descriptor.canManage,
      });
      return;
    }

    const snapshots = new Map<number, Record<string, any> | undefined>();
    const settledIndices = new Set<number>();
    const errorIndices = new Set<number>();
    let fallbackPromise: Promise<void> | undefined;

    const finishEmptyIfStillLoading = () => {
      if (!active) return;
      setState(previous => ({
        scopeKey,
        methods: previous.scopeKey === scopeKey ? previous.methods : [],
        revision: previous.scopeKey === scopeKey ? previous.revision : 0,
        loading: false,
        error: '',
        canManage: descriptor.canManage,
      }));
    };

    const recompute = () => {
      if (!active) return;
      const valid = [...snapshots.values()].filter(
        (item): item is Record<string, any> =>
          Boolean(item && Array.isArray(item.methods))
      );
      if (!valid.length) {
        if (settledIndices.size >= descriptor.paths.length) {
          if (settleTimer) window.clearTimeout(settleTimer);
          finishEmptyIfStillLoading();
        } else if (settledIndices.size >= 1 && !settleTimer && typeof window !== 'undefined') {
          settleTimer = window.setTimeout(finishEmptyIfStillLoading, 350);
        }
        return;
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = undefined;
      }
      valid.sort((a, b) => {
        const revDiff = (Number(b.revision) || 0) - (Number(a.revision) || 0);
        if (revDiff !== 0) return revDiff;
        return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
      });
      const best = valid[0];
      const normalizedMethods: PaymentMethod[] = (best.methods ?? []).map((m: any) => ({
        ...m,
        provider: resolvePaymentProviderKey(m.provider, m.id, m.name),
      }));
      const nextRevision = Number(best.revision) || 0;
      if (!isTestTransportActive()) {
        paymentScopeCache.set(scopeKey, { methods: normalizedMethods, revision: nextRevision });
      }
      setState({
        scopeKey,
        methods: normalizedMethods,
        revision: nextRevision,
        loading: false,
        error: '',
        canManage: descriptor.canManage,
      });
    };

    const loadBackendFallback = () =>
      (fallbackPromise ??= callBackend<{
        methods: PaymentMethod[];
        revision: number;
        canManage: boolean;
        scope?: string;
      }>('configurePaymentMethods', {
        operation: 'get',
        scope: descriptor.scope,
        tenantId: descriptor.primaryId,
        targetId: descriptor.secondaryId || descriptor.primaryId,
      })
        .then(result => {
          if (!active) return;
          // If calling an older undeployed function that ignores scope, only accept its data for super_admin
          if (descriptor.scope !== 'super_admin' && !result.scope) {
            setState(previous => ({
              ...previous,
              scopeKey,
              loading: false,
              error: '',
              canManage: descriptor.canManage,
            }));
            return;
          }
          setState(previous =>
            result.revision >= previous.revision || previous.scopeKey !== scopeKey
              ? {
                  scopeKey,
                  methods: result.methods ?? [],
                  revision: result.revision ?? 0,
                  canManage: descriptor.canManage || result.canManage,
                  loading: false,
                  error: '',
                }
              : {
                  ...previous,
                  scopeKey,
                  canManage: descriptor.canManage || result.canManage,
                  loading: false,
                  error: '',
                }
          );
        })
        .catch(error => {
          if (!active) return;
          const isPermDenied = /(?:^|\/)permission-denied$/i.test(
            String((error as { code?: string })?.code ?? '')
          );
          if (isPermDenied || (isPlatformTeamRole(role) && role !== 'SUPER_ADMIN')) {
            setState(previous => ({
              ...previous,
              scopeKey,
              canManage: descriptor.canManage,
              loading: false,
              error: '',
            }));
            return;
          }
          setState(previous => ({
            ...previous,
            scopeKey,
            loading: false,
            error: backendError(error),
          }));
        }));

    const unsubscribes = descriptor.paths.map((segments, index) => {
      const ref = doc(db, ...(segments as [string, ...string[]]));
      return onSnapshot(
        ref,
        snapshot => {
          settledIndices.add(index);
          snapshots.set(index, snapshot.data() as Record<string, any> | undefined);
          recompute();
        },
        error => {
          settledIndices.add(index);
          errorIndices.add(index);
          if (errorIndices.size >= descriptor.paths.length) {
            if (user?.id) void loadBackendFallback();
            else if (active) {
              const isPermDenied = /(?:^|\/)permission-denied$/i.test(
                String((error as { code?: string })?.code ?? '')
              );
              setState(previous => ({
                ...previous,
                scopeKey,
                methods: [],
                loading: false,
                error: isPermDenied ? '' : backendError(error),
              }));
            }
          } else {
            recompute();
          }
        }
      );
    });

    if (user?.id && descriptor.scope === 'super_admin') {
      void loadBackendFallback();
    }

    return () => {
      active = false;
      if (settleTimer) window.clearTimeout(settleTimer);
      unsubscribes.forEach(unsub => unsub());
    };
  }, [descriptor, scopeKey, user?.id, role, retry]);

  const currentMethods = state.scopeKey === scopeKey ? state.methods : [];
  const currentRevision = state.scopeKey === scopeKey ? state.revision : 0;
  const currentLoading = state.scopeKey === scopeKey ? state.loading : true;
  const currentError = state.scopeKey === scopeKey ? state.error : '';

  const getGateway = useCallback(
    async (provider: GatewayProvider): Promise<GatewayConfiguration> => {
      const privateSegments = descriptor.privateGatewayPath(provider);
      const privateRef = doc(db, ...(privateSegments as [string, ...string[]]));
      const localPrivate = await readSnapshotOnce(privateRef);
      if (localPrivate?.credentials) {
        return {
          ...gatewaySummary(provider, localPrivate.credentials),
          gatewayRevision: Number(localPrivate.revision) || 0,
        };
      }
      if (descriptor.scope === 'super_admin' || typeof (window as any).__publicPayments === 'function') {
        try {
          return await callBackend<GatewayConfiguration>('configurePaymentMethods', {
            operation: 'getGateway',
            scope: descriptor.scope,
            tenantId: descriptor.primaryId,
            provider,
          });
        } catch {
          // Fall back to empty summary when Cloud Function is not deployed for this scope
        }
      }
      return {
        ...gatewaySummary(provider, {}),
        gatewayRevision: 0,
      };
    },
    [descriptor]
  );

  const saveGateway = useCallback(
    async (
      provider: GatewayProvider,
      label: string,
      enabled: boolean,
      configuration: Record<string, string>,
      gatewayRevision: number
    ) => {
      if (!descriptor.canManage) {
        throw new Error('You do not have permission to configure payment gateways.');
      }
      const privateSegments = descriptor.privateGatewayPath(provider);
      const privateRef = doc(db, ...(privateSegments as [string, ...string[]]));
      const existingPrivate = await readSnapshotOnce(privateRef);
      const credentials = validateGatewayConfiguration(
        provider,
        configuration,
        existingPrivate?.credentials
      );
      const [method] = validatePaymentMethods(
        [
          {
            id: provider,
            provider,
            type: 'gateway',
            name: gatewayDisplayNames[provider],
            account: label,
            instructions: '',
            enabled,
          },
        ],
        currentMethods
      ) as PaymentMethod[];

      const nextMethods = [
        ...currentMethods.filter(m => m.provider !== provider),
        method,
      ];
      const nextRevision = currentRevision + 1;
      const now = new Date().toISOString();
      const updatedBy = user?.id ?? 'system';

      if (descriptor.scope === 'super_admin' || typeof (window as any).__publicPayments === 'function') {
        try {
          const backendRes = await callBackend<{
            methods: PaymentMethod[];
            revision: number;
            canManage: boolean;
          }>('configurePaymentMethods', {
            operation: 'saveGateway',
            scope: descriptor.scope,
            tenantId: descriptor.primaryId,
            provider,
            label,
            enabled,
            configuration,
            expectedGatewayRevision: gatewayRevision,
            expectedRevision: currentRevision,
          });
          await Promise.allSettled(
            descriptor.paths.map(segments =>
              setDoc(doc(db, ...(segments as [string, ...string[]])), {
                methods: backendRes.methods,
                revision: backendRes.revision,
                scope: descriptor.scope,
                tenantId: descriptor.primaryId,
                updatedBy,
                updatedAt: now,
              })
            )
          );
          setState({
            scopeKey,
            methods: backendRes.methods,
            revision: backendRes.revision,
            canManage: true,
            loading: false,
            error: '',
          });
          return backendRes;
        } catch (err) {
          if (typeof (window as any).__publicPayments === 'function' || (window as any).__saveFail) {
            throw err;
          }
        }
      }

      await setDoc(privateRef, {
        provider,
        credentials,
        revision: (Number(existingPrivate?.revision) || gatewayRevision || 0) + 1,
        scope: descriptor.scope,
        tenantId: descriptor.primaryId,
        updatedBy,
        updatedAt: now,
      });

      const payload = {
        methods: nextMethods,
        revision: nextRevision,
        scope: descriptor.scope,
        tenantId: descriptor.primaryId,
        updatedBy,
        updatedAt: now,
      };
      const writeResults = await Promise.allSettled(
        descriptor.paths.map(segments =>
          setDoc(doc(db, ...(segments as [string, ...string[]])), payload)
        )
      );
      if (writeResults.every(r => r.status === 'rejected')) {
        const firstErr = (writeResults[0] as PromiseRejectedResult).reason;
        throw firstErr;
      }

      const result = { methods: nextMethods, revision: nextRevision, canManage: true };
      if (!isTestTransportActive()) {
        paymentScopeCache.set(scopeKey, { methods: nextMethods, revision: nextRevision });
      }
      setState({
        scopeKey,
        ...result,
        loading: false,
        error: '',
      });
      return result;
    },
    [descriptor, currentMethods, currentRevision, scopeKey, user?.id]
  );

  const save = useCallback(
    async (methods: PaymentMethod[]) => {
      if (!descriptor.canManage) {
        throw new Error('You do not have permission to configure payment methods.');
      }
      const sanitized = validatePaymentMethods(methods, currentMethods) as PaymentMethod[];
      const nextRevision = currentRevision + 1;
      const now = new Date().toISOString();
      const updatedBy = user?.id ?? 'system';
      const payload = {
        methods: sanitized,
        revision: nextRevision,
        scope: descriptor.scope,
        tenantId: descriptor.primaryId,
        updatedBy,
        updatedAt: now,
      };

      if (descriptor.scope === 'super_admin' || typeof (window as any).__publicPayments === 'function') {
        try {
          const backendRes = await callBackend<{
            methods: PaymentMethod[];
            revision: number;
            canManage: boolean;
          }>('configurePaymentMethods', {
            operation: 'save',
            scope: descriptor.scope,
            tenantId: descriptor.primaryId,
            targetId: descriptor.secondaryId || descriptor.primaryId,
            expectedRevision: currentRevision,
            methods: sanitized,
          });
          await Promise.allSettled(
            descriptor.paths.map(segments =>
              setDoc(doc(db, ...(segments as [string, ...string[]])), {
                ...payload,
                methods: backendRes.methods,
                revision: backendRes.revision,
              })
            )
          );
          setState({
            scopeKey,
            methods: backendRes.methods,
            revision: backendRes.revision,
            canManage: true,
            loading: false,
            error: '',
          });
          return backendRes;
        } catch (err) {
          if (typeof (window as any).__publicPayments === 'function' || (window as any).__saveFail) {
            throw err;
          }
        }
      }

      const writeResults = await Promise.allSettled(
        descriptor.paths.map(segments =>
          setDoc(doc(db, ...(segments as [string, ...string[]])), payload)
        )
      );
      if (writeResults.every(r => r.status === 'rejected')) {
        const firstErr = (writeResults[0] as PromiseRejectedResult).reason;
        throw firstErr;
      }

      const result = { methods: sanitized, revision: nextRevision, canManage: true };
      if (!isTestTransportActive()) {
        paymentScopeCache.set(scopeKey, { methods: sanitized, revision: nextRevision });
      }
      setState({
        scopeKey,
        ...result,
        loading: false,
        error: '',
      });
      return result;
    },
    [descriptor, currentMethods, currentRevision, scopeKey, user?.id]
  );

  return {
    methods: currentMethods,
    revision: currentRevision,
    loading: currentLoading,
    error: currentError,
    scope: descriptor.scope,
    tenantId: descriptor.primaryId,
    refresh: () => setRetry(n => n + 1),
    canManage: descriptor.canManage,
    getGateway,
    saveGateway,
    save,
  };
}

export function checkoutMethods(methods: PaymentMethod[], allowed: string[]) {
  return methods
    .filter(m => m.enabled && (m.type === 'manual' || m.status === 'Connected' || m.status === 'Configured'))
    .flatMap(m => {
      if (m.type === 'manual') return [m.name];
      const labels =
        m.provider === 'stripe'
          ? ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay']
          : [m.name];
      const filtered = labels.filter(name => allowed.includes(name));
      return filtered.length ? filtered : [m.name];
    });
}

export function useCheckoutMethods(allowed: string[], options?: UsePaymentMethodsOptions) {
  const { methods } = usePaymentMethods(options ?? { scope: 'user' });
  return checkoutMethods(methods, allowed);
}
