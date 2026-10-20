import { auth, db, firebaseConfig } from '../backend/firebase';

export async function gosFirebase() {
  if (firebaseConfig.projectId !== 'gos-app-3c7fb') throw new Error('Unexpected platform configuration.');
  return { auth, db };
}
