import { LogOut } from 'lucide-react';
import { isDemoAccount } from '../../backend/demoContext';
import { logoutFirebase } from '../../backend/session';
import { translateText as t } from '../../i18n/display';
export function DemoAccountControl() {
  if (!isDemoAccount) return null;
  return <button type="button" onClick={() => void logoutFirebase()} title={t('Exit demo · all changes are simulated')} aria-label={t('Exit Demo Account')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1.5 text-xs font-semibold text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300"><span>{t('Demo')}</span><LogOut size={13}/></button>;
}
