export type TokenProvider = (refresh?: boolean) => Promise<string>;

export function createGosTransport(baseUrl: string, token: TokenProvider, fetcher: typeof fetch = fetch) {
  return async function request<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; public?: boolean; csv?: boolean } = {}): Promise<T> {
    const controller = new AbortController();
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const headers = new Headers({ Accept: options.csv ? 'text/csv' : 'application/json' });
        if (!options.public) headers.set('Authorization', `Bearer ${await token(attempt === 1)}`);
        const multipart = options.body instanceof FormData;
        if (options.body !== undefined && !multipart) headers.set('Content-Type', 'application/json');
        let response: Response;
        try {
          response = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
            method: options.method ?? 'GET', headers, signal,
            body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body),
          });
        } catch (error) {
          if (options.signal?.aborted) throw error;
          throw new Error(controller.signal.aborted ? 'The request timed out. Please try again.' : 'Cannot reach the GOS API. Check your connection and try again.');
        }
        if (response.status === 401 && !options.public && attempt === 0) continue;
        if (options.csv && response.ok) return await response.text() as T;
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) {
          const errors = payload?.error?.details ?? payload?.errors;
          const detail = errors && typeof errors === 'object' ? Object.values(errors).flat().filter(v => typeof v === 'string').join(' ') : '';
          throw new Error(detail || payload?.error?.message || payload?.message || `GOS API request failed (${response.status}).`);
        }
        if (payload?.data === undefined) throw new Error('The GOS API returned an unexpected response.');
        return payload.data as T;
      }
      throw new Error('Your session has expired. Sign in again.');
    } finally { clearTimeout(timeout); }
  };
}
