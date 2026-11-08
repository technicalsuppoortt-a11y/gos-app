import { useSyncExternalStore } from 'react';
import JoeAcademyLogo from '../components/ui/JoeAcademyLogo';
import { useStore } from '../store/useStore';
import { getSessionError, subscribeSessionError } from './session';
import { JOE_ACADEMY_ORIGIN } from './config';

/** Shown when /launch-brand is opened without a valid Joe Academy ticket. */
export default function OpenFromAcademy() {
  const language = useStore(state => state.language);
  const error = useSyncExternalStore(subscribeSessionError, getSessionError);
  const isAr = language === 'ar';
  const title = isAr ? 'افتح إطلاق البراند من Joe Academy' : 'Open Launch Brand from Joe Academy';
  const body = error === 'expired'
    ? (isAr ? 'انتهت صلاحية هذا الرابط أو تم استخدامه بالفعل. سجّل الدخول في Joe Academy واضغط "ابنِ براندك" مرة أخرى.' : 'This link has expired or was already used. Sign in to Joe Academy and press "Build your brand" again.')
    : (isAr ? 'لا يمكن فتح هذه الصفحة برابط مباشر. سجّل الدخول في Joe Academy واضغط "ابنِ براندك".' : 'This page can’t be opened from a direct link. Sign in to Joe Academy and press "Build your brand".');
  return <main className="min-h-screen grid place-content-center gap-5 p-8 text-center" dir={isAr ? 'rtl' : 'ltr'}>
    <JoeAcademyLogo className="mx-auto h-14 w-14" />
    <h1 className="text-xl font-bold">{title}</h1>
    <p className="max-w-md text-sm opacity-80">{body}</p>
    <a className="mx-auto rounded-xl bg-[#635bff] px-5 py-3 text-sm font-bold text-white" href={`${JOE_ACADEMY_ORIGIN}/dashboard`}>
      {isAr ? 'الذهاب إلى Joe Academy' : 'Go to Joe Academy'}
    </a>
  </main>;
}
