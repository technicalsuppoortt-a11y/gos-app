import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';
import config from './phoenix-public-config.json';

// Verify Phoenix passwords with Phoenix Auth. Passwords are never copied into
// Upclick until the server independently verifies them against the source account.
export async function loginWithPhoenix(email: string, password: string) {
  const app = initializeApp(config, `phoenix-login-${crypto.randomUUID()}`);
  const sourceAuth = getAuth(app);
  try {
    await setPersistence(sourceAuth, inMemoryPersistence);
    const { user } = await signInWithEmailAndPassword(sourceAuth, email.trim(), password);
    const response = await fetch('https://us-central1-gos-app-3c7fb.cloudfunctions.net/phoenixPlatform', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password }), signal: AbortSignal.timeout(120000),
    });
    const result = await response.json();
    if (!response.ok || !result.customToken) throw new Error(result.error || 'تعذر فتح المنصة من Phoenix.');
    return await signInWithCustomToken(auth, result.customToken);
  } finally {
    await signOut(sourceAuth).catch(() => {});
    await deleteApp(app);
  }
}
