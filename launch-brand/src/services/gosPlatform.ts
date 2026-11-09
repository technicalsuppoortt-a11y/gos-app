import { auth } from '../lib/firebase';
import { PLATFORM_ENDPOINT } from '../host/config';

export async function requestGosPlatform(action: 'deploy' | 'open' | 'platform-status', revision?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('يرجى تسجيل الدخول مرة أخرى.');
  const token = await user.getIdToken();
  const response = await fetch(PLATFORM_ENDPOINT, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, revision }), signal: AbortSignal.timeout(action === 'platform-status' ? 15000 : 120000),
  }).catch(() => { throw new Error('تعذر الاتصال بخدمة إطلاق المنصة. تحقق من الاتصال وأعد المحاولة. / Could not reach the platform deployment service. Please retry.'); });
  const result = await response.json();
  if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed.');
  if (!response.ok) throw new Error(result.error || 'تعذر تجهيز المنصة. أعد المحاولة.');
  return result as { status?: string; revision?: string; customToken?: string; deployed?: boolean };
}
export async function openGosPlatform() {
  const { customToken } = await requestGosPlatform('open');
  if (!customToken) throw new Error('تعذر تسجيل الدخول إلى المنصة.');
  window.location.replace(`/auth/phoenix#token=${encodeURIComponent(customToken)}`);
}
