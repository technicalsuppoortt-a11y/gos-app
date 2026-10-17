import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export async function gosFirebase() {
  let app = getApps().find(app => app.name === 'gos-platform');
  if (!app) {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) throw new Error('Could not connect to your platform.');
    const config = await response.json();
    if (config.projectId !== 'gos-app-3c7fb') throw new Error('Unexpected platform configuration.');
    app = initializeApp(config, 'gos-platform');
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}
