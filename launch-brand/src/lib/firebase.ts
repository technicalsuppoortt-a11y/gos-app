import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // RTDB — optional; presence/typing features require this
  ...(import.meta.env.VITE_FIREBASE_DATABASE_URL
    ? { databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL }
    : {}),
};

// gos-app: Launch Brand runs on gos-app-3c7fb under its own app name, so its
// sign-in is stored apart from the gos dashboard's session on the same site.
const LAUNCH_BRAND_APP = window.location.pathname.startsWith('/launch-brand/admin-settings') ? 'launch-brand-admin' : 'launch-brand';
const primaryApp = getApps().find(app => app.name === LAUNCH_BRAND_APP) ?? initializeApp(firebaseConfig, LAUNCH_BRAND_APP);

// Secondary App Configuration for Media Only
const mediaStorageConfig = {
  apiKey: import.meta.env.VITE_MEDIA_STORAGE_API_KEY,
  authDomain: import.meta.env.VITE_MEDIA_STORAGE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_MEDIA_STORAGE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_MEDIA_STORAGE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MEDIA_STORAGE_MESSAGE_SENDER_ID,
  appId: import.meta.env.VITE_MEDIA_STORAGE_APP_ID,
  measurementId: import.meta.env.VITE_MEDIA_STORAGE_MEASUREMENT_ID,
};

// gos-app: Launch Brand has no separate media project; without its config the
// media bucket falls back to Launch Brand's own bucket.
const mediaApp = mediaStorageConfig.projectId
  ? getApps().find(app => app.name === "mediaStorage") || initializeApp(mediaStorageConfig, "mediaStorage")
  : primaryApp;

export const auth = getAuth(primaryApp);
// gos-app: Launch Brand's data lives in its own Firestore database and bucket
// inside gos-app-3c7fb, with the same structure it had on Joe Academy.
const launchBrandBucket = import.meta.env.VITE_LAUNCH_BRAND_STORAGE_BUCKET;
export const db = getFirestore(primaryApp, import.meta.env.VITE_LAUNCH_BRAND_DATABASE || 'launch-brand');
export const storage = launchBrandBucket ? getStorage(primaryApp, `gs://${launchBrandBucket}`) : getStorage(primaryApp);
export const mediaStorage = mediaApp === primaryApp ? storage : getStorage(mediaApp);
export const googleProvider = new GoogleAuthProvider();

// Realtime Database — null when VITE_FIREBASE_DATABASE_URL is not set.
// All presence/typing features degrade gracefully when rtdb is null.
export const rtdb: Database | null = import.meta.env.VITE_FIREBASE_DATABASE_URL
  ? getDatabase(primaryApp)
  : null;

// Local testing without touching production: set VITE_USE_EMULATORS=true in .env.local
// and run `firebase emulators:start`. Ports match the "emulators" block in firebase.json.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(getFunctions(primaryApp, 'us-central1'), '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  // Chat uploads use the media app; point it at the same local storage emulator.
  connectStorageEmulator(mediaStorage, '127.0.0.1', 9199);
  if (rtdb) connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
}
