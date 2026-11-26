import { auth } from '../lib/firebase';
import { PLATFORM_ENDPOINT } from '../host/config';

const PHOENIX_HANDOFF_TOKEN_KEY = 'gos.phoenix.handoff_token';
let transitioningToPlatform = false;
export const isTransitioningToPlatform = () => transitioningToPlatform;

export async function requestGosPlatform(action: 'deploy' | 'open' | 'platform-status', revision?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('يرجى تسجيل الدخول مرة أخرى.');
  if (action === 'deploy' || action === 'open') transitioningToPlatform = true;
  try {
    const token = await user.getIdToken();
    const response = await fetch(PLATFORM_ENDPOINT, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, revision }), signal: AbortSignal.timeout(action === 'platform-status' ? 15000 : 120000),
    }).catch(() => { throw new Error('تعذر الاتصال بخدمة إطلاق المنصة. تحقق من الاتصال وأعد المحاولة. / Could not reach the platform deployment service. Please retry.'); });
    const result = await response.json();
    if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed.');
    if (!response.ok) throw new Error(result.error || 'تعذر تجهيز المنصة. أعد المحاولة.');
    return result as { status?: string; revision?: string; customToken?: string; deployed?: boolean };
  } catch (error) {
    if (action === 'deploy' || action === 'open') transitioningToPlatform = false;
    throw error;
  }
}
export async function openGosPlatform() {
  transitioningToPlatform = true;
  try {
    const { customToken } = await requestGosPlatform('open');
    if (!customToken) throw new Error('تعذر تسجيل الدخول إلى المنصة.');
    try {
      window.sessionStorage.setItem(PHOENIX_HANDOFF_TOKEN_KEY, customToken);
    } catch {
      /* ignore restricted storage */
    }
    window.location.replace(`/auth/phoenix#token=${encodeURIComponent(customToken)}`);
  } catch (error) {
    transitioningToPlatform = false;
    throw error;
  }
}
