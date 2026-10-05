import { toast } from 'sonner';
import type { ReactNode } from 'react';



export const showToast = {
  success: (message: string, description?: ReactNode) => {
    toast.success(message, {
      description,
      icon: '✓',
      className: 'group-[.toaster]:border-green-100 dark:group-[.toaster]:border-green-900/30 group-[.toaster]:bg-green-50/50 dark:group-[.toaster]:bg-green-900/10',
    });
  },
  error: (message: string, description?: ReactNode) => {
    toast.error(message, {
      description,
      icon: '✕',
      className: 'group-[.toaster]:border-red-100 dark:group-[.toaster]:border-red-900/30 group-[.toaster]:bg-red-50/50 dark:group-[.toaster]:bg-red-900/10',
    });
  },
  info: (message: string, description?: ReactNode) => {
    toast.info(message, {
      description,
      icon: 'ℹ',
      className: 'group-[.toaster]:border-blue-100 dark:group-[.toaster]:border-blue-900/30 group-[.toaster]:bg-blue-50/50 dark:group-[.toaster]:bg-blue-900/10',
    });
  },
  warning: (message: string, description?: ReactNode) => {
    toast.warning(message, {
      description,
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
      loading,
      success,
      error,
    });
  },
};
