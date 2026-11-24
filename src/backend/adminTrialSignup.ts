import { isDemoAccount } from './demoContext';
import { callBackend } from './firebase';

export type RegisterTrialAdminInput = {
  name: string;
  workspaceName: string;
  email: string;
  phone?: string;
  password: string;
  language: string;
  acceptTrialTerms: boolean;
  requestId: string;
};

export type RegisterTrialAdminResult = {
  id: string;
  tenantId: string;
  trialDays: number;
  credits: number;
  status: 'trialing';
  localTrialFallback?: boolean;
};

function isLocalHostOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local');
}

function buildLocalTrialFallback(): RegisterTrialAdminResult {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const id = `demo-admin-${raw}`;
  return {
    id,
    tenantId: `agency-${id}`,
    trialDays: 14,
    credits: 1000,
    status: 'trialing',
    localTrialFallback: true,
  };
}

function isReachabilityOrCorsFailure(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || '').toLowerCase();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  if (
    code.includes('already-exists') ||
    code.includes('invalid-argument') ||
    code.includes('failed-precondition') ||
    code.includes('permission-denied') ||
    code.includes('resource-exhausted')
  ) {
    return false;
  }
  return (
    code === 'functions/internal' ||
    code === 'internal' ||
    code === 'functions/unavailable' ||
    code === 'unavailable' ||
    code === 'functions/not-found' ||
    code === 'not-found' ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('cors') ||
    message.includes('err_failed') ||
    message.includes('load failed')
  );
}

export async function registerTrialAdminAccount(
  input: RegisterTrialAdminInput,
): Promise<RegisterTrialAdminResult> {
  // Inside the isolated Demo / Launch Brand module graph, use the in-memory demo adapter directly.
  if (isDemoAccount) {
    return callBackend<RegisterTrialAdminResult>('registerTrialAdmin', input, 60000);
  }

  const localHost = isLocalHostOrigin();
  const usingEmulators =
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' ||
    Boolean(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT);

  // In Vite dev on localhost (without local Functions emulator), route through the same-origin
  // `/api-functions` proxy so the browser never hits a cross-origin preflight/CORS block.
  if (import.meta.env.DEV && localHost && !usingEmulators && typeof fetch === 'function') {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 25000);
      let response: Response;
      try {
        response = await fetch('/api-functions/registerTrialAdmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: input }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = (await response.json().catch(() => null)) as {
          result?: RegisterTrialAdminResult;
          data?: RegisterTrialAdminResult;
          error?: { status?: string; message?: string };
        } | null;

        if (response.ok && (body?.result || body?.data)) {
          return { ...(body.result || body.data)!, localTrialFallback: false };
        }

        if (body?.error) {
          const status = String(body.error.status || 'INTERNAL')
            .toLowerCase()
            .replace(/_/g, '-');
          if (status !== 'not-found' && status !== 'unavailable' && status !== 'unimplemented') {
            const structuredError = new Error(body.error.message || 'Registration error') as Error & {
              code?: string;
            };
            structuredError.code = `functions/${status}`;
            throw structuredError;
          }
        }
      }

      // Function is not yet deployed to Cloud Functions (404/502/503) while developing on localhost:
      // provision an unlocked local Admin Free Trial workspace so local onboarding works immediately.
      if (response.status === 404 || response.status >= 500) {
        return buildLocalTrialFallback();
      }
    } catch (proxyErr) {
      if (!isReachabilityOrCorsFailure(proxyErr)) {
        throw proxyErr;
      }
      return buildLocalTrialFallback();
    }
  }

  try {
    const result = await callBackend<RegisterTrialAdminResult>('registerTrialAdmin', input, 60000);
    return { ...result, localTrialFallback: false };
  } catch (error) {
    if (localHost && isReachabilityOrCorsFailure(error)) {
      return buildLocalTrialFallback();
    }
    throw error;
  }
}
