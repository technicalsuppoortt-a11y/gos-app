import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { translateText } from '../../i18n/display';
export function ActivationPage() {
  const [params] = useSearchParams();
  if (params.get('oobCode')) return <Navigate to={`/auth/reset-password?${params.toString()}`} replace/>;
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 dark:bg-slate-950"><section className="w-full max-w-md rounded-2xl border bg-white p-8 dark:border-slate-800 dark:bg-slate-900"><h1 className="text-xl font-bold">{translateText('Request a new setup link')}</h1><p className="mt-3 text-sm text-slate-500" role="alert">{translateText('This invitation uses an older activation flow. Ask your administrator for a new password setup link, or request a password reset for your account.')}</p><Link className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white" to="/auth/forgot-password">{translateText('Reset password')}</Link><Link className="ms-4 text-sm" to="/auth/login">{translateText('Back to sign in')}</Link></section></main>;
}
