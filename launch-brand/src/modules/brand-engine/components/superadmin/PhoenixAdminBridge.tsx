import type { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import { usePhoenixTheme } from '../../hooks/usePhoenixTheme';
import './phoenix-admin.css';

/** Hosts the original BrandEngine consoles without loading or saving a customer draft. */
export function PhoenixAdminBridge({ children, discovery = false }: { children: ReactNode; discovery?: boolean }) {
  const language = useStore(state => state.language);
  const uid = useStore(state => state.user?.uid);
  const theme = usePhoenixTheme();
  return <section
    key={uid}
    className={`brand-engine-module phoenix-brand-admin ${theme}${discovery ? ' phoenix-brand-admin--discovery' : ''}`}
    dir={language === 'ar' ? 'rtl' : 'ltr'}
  >{children}</section>;
}
