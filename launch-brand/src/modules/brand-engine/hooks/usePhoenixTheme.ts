import { useSyncExternalStore } from 'react';
import { useStore } from '../../../store/useStore';
import { resolveDisplayTheme } from '../store/syncDisplayPreferences';

const query = '(prefers-color-scheme: dark)';
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const getSystemDark = () => window.matchMedia(query).matches;

export function usePhoenixTheme() {
  const preference = useStore(state => state.theme);
  const systemDark = useSyncExternalStore(subscribe, getSystemDark, () => false);
  return resolveDisplayTheme(preference, systemDark);
}
