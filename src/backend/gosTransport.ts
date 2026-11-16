export type TokenProvider = (refresh?: boolean) => Promise<string>;

export class GosApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'GosApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type GosStreamHandlers = {
  onStatus?: (phase: string) => void;
  onTranscript?: (payload: { transcript: string; conversationId?: string; user?: Record<string, unknown> }) => void;
  onDelta?: (delta: string) => void;
};

export function createGosStreamTransport(
  baseUrl: string,
  token: TokenProvider,
  fetcher: typeof fetch = fetch,
  beforeRequest?: (path: string, method: string) => Promise<void>,
) {
  return async function streamRequest<T>(
    path: string,
    body: unknown,
    handlers: GosStreamHandlers = {},
    externalSignal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([externalSignal, controller.signal]) : controller.signal;
    const timeout = setTimeout(() => controller.abort(), 140000);
    try {
      await beforeRequest?.(path, 'POST');
      for (let attempt = 0; attempt < 2; attempt++) {
        const headers = new Headers({
          Accept: 'text/event-stream, application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await token(attempt === 1)}`,
        });
        let response: Response;
        try {
          response = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
            method: 'POST',
            headers,
            signal,
            body: JSON.stringify(body),
          });
        } catch (error) {
          if (externalSignal?.aborted) throw error;
          throw new Error(controller.signal.aborted ? 'The request timed out. Please try again.' : 'Cannot reach the Upklick API. Check your connection and try again.');
        }

        if (response.status === 401 && attempt === 0) continue;

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const errors = payload?.error?.details ?? payload?.errors;
          const detail = errors && typeof errors === 'object' ? Object.values(errors).flat().filter(v => typeof v === 'string').join(' ') : '';
          throw new GosApiError(
            detail || payload?.error?.message || payload?.message || `Upklick API request failed (${response.status}).`,
            response.status,
            payload?.error?.code ?? (typeof payload?.error === 'string' ? payload.error : payload?.code),
            errors && typeof errors === 'object' && !Array.isArray(errors) ? (errors as Record<string, unknown>) : undefined,
          );
        }

        if (!response.body) {
          throw new Error('Streaming response body is unavailable.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let finalPayload: T | undefined;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const rawBlock = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf('\n\n');

              if (!rawBlock.trim() || rawBlock.trimStart().startsWith(':')) continue;

              let eventName = 'message';
              const dataLines: string[] = [];
              for (const line of rawBlock.split('\n')) {
                if (line.startsWith('event:')) {
                  eventName = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  dataLines.push(line.slice(5).trimStart());
                }
              }

              if (!dataLines.length) continue;
              let parsed: any;
              try {
                parsed = JSON.parse(dataLines.join('\n'));
              } catch {
                continue;
              }

              if (eventName === 'status' && typeof parsed?.phase === 'string') {
                handlers.onStatus?.(parsed.phase);
              } else if (eventName === 'transcript' && typeof parsed?.transcript === 'string') {
                handlers.onTranscript?.(parsed);
              } else if (eventName === 'delta' && typeof parsed?.delta === 'string' && parsed.delta) {
                handlers.onDelta?.(parsed.delta);
              } else if (eventName === 'error') {
                throw new GosApiError(
                  String(parsed?.message || 'The AI service could not complete the response right now.'),
                  503,
                  typeof parsed?.code === 'string' ? parsed.code : 'ai_unavailable',
                );
              } else if (eventName === 'done') {
                finalPayload = parsed as T;
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (finalPayload === undefined) {
          throw new Error('The stream ended before a complete response arrived.');
        }
        return finalPayload;
      }
      throw new Error('Your session has expired. Sign in again.');
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function createGosTransport(baseUrl: string, token: TokenProvider, fetcher: typeof fetch = fetch, beforeRequest?: (path: string, method: string) => Promise<void>) {
  return async function request<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; public?: boolean; csv?: boolean; onResponse?: (status: number) => void } = {}): Promise<T> {
    const controller = new AbortController();
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      if (!options.public) await beforeRequest?.(path, options.method ?? 'GET');
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
          throw new Error(controller.signal.aborted ? 'The request timed out. Please try again.' : 'Cannot reach the Upklick API. Check your connection and try again.');
        }
        if (response.status === 401 && !options.public && attempt === 0) continue;
        options.onResponse?.(response.status);
        if (response.status === 204 && response.ok) return undefined as T;
        if (options.csv && response.ok) return await response.text() as T;
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) {
          const errors = payload?.error?.details ?? payload?.errors;
          const detail = errors && typeof errors === 'object' ? Object.values(errors).flat().filter(v => typeof v === 'string').join(' ') : '';
          throw new GosApiError(
            detail || payload?.error?.message || payload?.message || `Upklick API request failed (${response.status}).`,
            response.status,
            payload?.error?.code ?? (typeof payload?.error === 'string' ? payload.error : payload?.code),
            errors && typeof errors === 'object' && !Array.isArray(errors) ? (errors as Record<string, unknown>) : undefined,
          );
        }
        if (payload?.data === undefined) throw new Error('The Upklick API returned an unexpected response.');
        return payload.data as T;
      }
      throw new Error('Your session has expired. Sign in again.');
    } finally { clearTimeout(timeout); }
  };
}
