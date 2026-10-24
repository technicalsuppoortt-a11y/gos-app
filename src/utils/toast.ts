import { toast } from 'sonner';
import type { ReactNode } from 'react';
import { translateText, localizeNode } from '../i18n/display';
import { hasPendingWrites } from '../backend/writeStatus';



function normalizeMessage(message: unknown, fallback: string): string {
  if (typeof message === 'string' && message.trim()) return message;
  if (message instanceof Error && message.message) return message.message;
  if (message && typeof message === 'object' && 'message' in (message as any)) {
    const m = (message as any).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (message !== undefined && message !== null) return String(message);
  return fallback;
}

export const showToast = {
  success: (message: unknown, description?: ReactNode) => {
    const text = normalizeMessage(message, 'Action completed successfully');
    if (hasPendingWrites()) { toast.info(translateText('Saving changes…'), { description: translateText(text) }); return; }
    toast.success(translateText(text), {
      description: description ? localizeNode(description) : undefined,
      icon: '✓',
      className: 'group-[.toaster]:border-green-100 dark:group-[.toaster]:border-green-900/30 group-[.toaster]:bg-green-50/50 dark:group-[.toaster]:bg-green-900/10',
    });
  },
  error: (message: unknown, description?: ReactNode) => {
    const text = normalizeMessage(message, 'The action could not be completed. Please try again.');
    toast.error(translateText(text), {
      description: description ? localizeNode(description) : undefined,
      duration: 5000,
      icon: '✕',
      className: 'group-[.toaster]:border-red-100 dark:group-[.toaster]:border-red-900/30 group-[.toaster]:bg-red-50/50 dark:group-[.toaster]:bg-red-900/10',
    });
  },
  info: (message: unknown, description?: ReactNode) => {
    const text = normalizeMessage(message, 'Information');
    toast.info(translateText(text), {
      description: description ? localizeNode(description) : undefined,
      icon: 'ℹ',
      className: 'group-[.toaster]:border-blue-100 dark:group-[.toaster]:border-blue-900/30 group-[.toaster]:bg-blue-50/50 dark:group-[.toaster]:bg-blue-900/10',
    });
  },
  warning: (message: unknown, description?: ReactNode) => {
    const text = normalizeMessage(message, 'Warning');
    toast.warning(translateText(text), {
      description: description ? localizeNode(description) : undefined,
      icon: '⚠',
      className: 'group-[.toaster]:border-orange-100 dark:group-[.toaster]:border-orange-900/30 group-[.toaster]:bg-orange-50/50 dark:group-[.toaster]:bg-orange-900/10',
    });
  },
  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    toast.promise(promise, {
      loading: translateText(loading),
      success: typeof success === 'function' ? (data: T) => translateText(success(data)) : translateText(success),
      error: typeof error === 'function' ? (err: any) => translateText(error(err)) : translateText(error),
    });
  },
};

export { toast };
