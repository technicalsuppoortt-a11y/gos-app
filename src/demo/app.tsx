import { createRoot } from 'react-dom/client';
import App from '../App';
import { store } from '../store';
import { loginSuccess } from '../store/slices/authSlice';
import { demoSession } from './adapters/session';
import { seedAccount } from './seed';
import { read } from './store';
import { showToast } from '../utils/toast';
import '../index.css';
import '../layout-shell.css';
import '../global-controls.css';
import '../i18n/rtl.css';
import '../theme-surfaces.css';
import '../theme-controls.css';
import '../control-polish.css';
import '../light-contrast.css';
import '../module-updates.css';

store.dispatch(loginSuccess(demoSession));
seedAccount();
const profile = read<any>('settings')?.profile;
if (profile) store.dispatch(loginSuccess({ ...demoSession, user: { ...demoSession.user, name: profile.name, email: profile.email, avatar: profile.photo } }));
window.addEventListener('gos-demo-external', () => showToast.info('External services are simulated in this demo.'));
createRoot(document.getElementById('root')!).render(<App/>);

import '../branding/upclick.css';
