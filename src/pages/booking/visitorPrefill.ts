import { browserStorage } from '../../utils/browserStorage';

const key = (pageId: string) => 'gos.booking.prefill.' + pageId;

/** Visitor details belong to this browser and booking page, not workspace storage. */
export function readVisitorAnswers(pageId: string | undefined, enabled: boolean): Record<string, string> {
  if (!pageId || !enabled) return {};
  try {
    const value: unknown = JSON.parse(browserStorage.getItem(key(pageId)) || 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, answer]) =>
      !['__proto__', 'constructor', 'prototype'].includes(id) && typeof answer === 'string',
    ));
  } catch { return {}; }
}

export function readVisitorPhone(pageId: string | undefined, enabled: boolean): string {
  if (!pageId || !enabled) return '';
  try { return browserStorage.getItem(key(pageId) + '.phone') ?? readVisitorAnswers(pageId, enabled).whatsapp ?? ''; }
  catch { return ''; }
}

export function saveVisitorAnswers(pageId: string, enabled: boolean, answers: Record<string, string>, phone?: string): void {
  if (!enabled) return;
  try {
    browserStorage.setItem(key(pageId), JSON.stringify(answers));
    if (phone !== undefined) browserStorage.setItem(key(pageId) + '.phone', phone);
    else browserStorage.removeItem(key(pageId) + '.phone');
  }
  catch { /* Optional autofill must never change a successful booking's result. */ }
}
