import { createRoot } from 'react-dom/client';
import App from '../App';
import { preloadInitialRoute } from '../router';
import { store } from '../store';
import { loginSuccess } from '../store/slices/authSlice';
import { activeDemoSession, demoSession, readAdminTrialSeed } from './adapters/session';
import { seedTrialAdminWorkspace } from './adapters/billing';
import { seedAccount } from './seed';
import { read } from './store';
import { showToast } from '../utils/toast';
import '../index.css';
import '../layout-shell.css';
import '../global-controls.css';
import '../i18n/rtl.css';
import '../theme-surfaces.css';
import '../theme-controls.css';
import '../light-contrast.css';
import '../control-polish.css';
import '../module-updates.css';
import '../branding/upclick.css';
import '../context/workspace-customization.css';
import '../styles/compact-workspace.css';
import { installLaunchBrandPreview } from '../branding/launchBrandPreview';

let mounted = false;

export async function mountDemoApp() {
  if (mounted) return;
  mounted = true;
  installLaunchBrandPreview();
  const initialSession = activeDemoSession();
  store.dispatch(loginSuccess(initialSession));
  seedAccount();
  const adminTrialSeed = readAdminTrialSeed();
  if (adminTrialSeed) {
    await seedTrialAdminWorkspace(adminTrialSeed);
  } else if (initialSession.role === 'USER') {
    const profile = read<any>('settings')?.profile;
    if (profile) {
      store.dispatch(
        loginSuccess({
          ...demoSession,
          user: { ...demoSession.user, name: profile.name, email: profile.email, avatar: profile.photo },
        }),
      );
    }
  }
  window.addEventListener('gos-demo-external', () => showToast.info('External services are simulated in this demo.'));
  await preloadInitialRoute(location.pathname, location.search);
  createRoot(document.getElementById('root')!).render(<App />);
}
