import type { CSSProperties } from 'react';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import './app-notifications.css';

// Both notification APIs share this appearance, including legacy save actions.
const successStyle: CSSProperties = {
  background: 'hsl(143, 85%, 96%)',
  border: '1px solid hsl(145, 92%, 87%)',
  color: 'hsl(140, 100%, 27%)',
  borderRadius: 8,
  boxShadow: '0 4px 12px #0000001a',
  width: 356,
  maxWidth: 'calc(100vw - 32px)',
  padding: 16,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'Tajawal, sans-serif',
  lineHeight: 1.5,
};

export default function AppNotifications({ theme, language }: { theme: string; language: string }) {
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  return <>
    <SonnerToaster
      theme={theme === 'dark' ? 'dark' : 'light'}
      dir={direction}
      position="top-center"
      offset={20}
      richColors
      toastOptions={{ classNames: { success: 'app-success-notification' } }}
    />
    <Toaster
      position="top-center"
      containerStyle={{ top: 20, direction }}
      toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#fff',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          fontFamily: 'Tajawal, sans-serif',
          fontSize: 14,
          fontWeight: 600,
        },
        success: {
          position: 'top-center',
          style: { ...successStyle, backdropFilter: 'none', WebkitBackdropFilter: 'none', direction, textAlign: 'start' },
          iconTheme: { primary: 'hsl(140, 100%, 27%)', secondary: 'hsl(143, 85%, 96%)' },
        },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } },
      }}
    />
  </>;
}
