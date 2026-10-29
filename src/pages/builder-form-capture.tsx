import { createContext, useContext, useRef, useState, type FormEvent } from 'react';
import type { BuilderSection } from './BuilderWorkspace';
import { callBackend, backendError } from '../backend/firebase';
import { showToast } from '../utils/toast';
import { Tracking } from '../backend/marketingTracking';

export type PublicCaptureConfig = { tenantId: string; captureToken: string; endpoint: string };
type Submission = { customFields?: Record<string, string>; formId: string; requestId: string; name: string; email: string; phone: string; message: string };
export const BuilderFormCaptureContext = createContext<((submission: Submission) => Promise<unknown>) | null>(null);

export async function sendBuilderLead(assetId: string, pageId: string, device: string, submission: Submission, capture?: PublicCaptureConfig) {
  const data = { ...submission, assetId, pageId, device };
  if (!capture) return callBackend('captureAssetLead', { ...data, preview: true });
  const endpoint = new URL(capture.endpoint);
  if (endpoint.protocol !== 'https:' || !/^us-central1-[a-z0-9-]+\.cloudfunctions\.net$/.test(endpoint.hostname) || endpoint.pathname !== '/captureAssetLead') throw new Error('This form needs to be republished before receiving submissions.');
  try {
    const response = await fetch(endpoint.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { ...data, tenantId: capture.tenantId, captureToken: capture.captureToken } }), signal: AbortSignal.timeout(30000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error || result.result?.accepted !== true) throw new Error(result.error?.message || 'Could not send this form. Your details are still here; please try again.');
    Tracking.lead({ assetId, pageId, source: 'published_form' });
    return result.result;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name))) throw new Error('Could not reach the form service. Your details are still here; please try again.');
    throw error;
  }
}

/** Optional runtime behavior; the canvas document and field schema stay intact. */
export function useBuilderFormCapture(item: BuilderSection) {
  const capture = useContext(BuilderFormCaptureContext);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), attempt = useRef<{ signature: string; id: string } | null>(null);
  return { busy, submit: (event: FormEvent<HTMLFormElement>, success: () => void) => {
    event.preventDefault();
    if (!capture) { success(); return; }
    if (lock.current) return;
    const form = event.currentTarget, fields = new FormData(form);
    const values = { name: String(fields.get('name') ?? ''), email: String(fields.get('email') ?? ''), phone: String(fields.get('phone') ?? ''), message: String(fields.get('message') ?? '') };
    // A builder can label a name field "Full Name" or add custom text inputs.
    if (!values.name) values.name = String(fields.get('full_name') ?? '');
    if (!values.email) values.email = form.querySelector<HTMLInputElement>('input[type=email]')?.value ?? '';
    if (!values.phone) values.phone = form.querySelector<HTMLInputElement>('input[type=tel]')?.value ?? '';
    if (!Object.values(values).some(value => value.trim())) values.message = [...fields.entries()].map(([key, value]) => `${key}: ${String(value)}`).join('\n');
    const customFields = Object.fromEntries([...fields.entries()].map(([key, value]) => [key, String(value)]));
    const signature = JSON.stringify({ ...values, customFields });
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    lock.current = true; setBusy(true);
    void capture({ ...values, customFields, formId: item.id, requestId: attempt.current.id }).then(() => { attempt.current = null; success(); form.reset(); }).catch(error => showToast.error(backendError(error))).finally(() => { lock.current = false; setBusy(false); });
  } };
}
