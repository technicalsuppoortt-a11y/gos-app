import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { store } from '../../src/store';
import { setLanguage, toggleTheme } from '../../src/store/slices/uiSlice';
import { ThemeProvider } from '../../src/context/ThemeProvider';
import { WorkspaceSkeleton } from '../../src/components/common/WorkspaceLoading';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import '../../src/index.css';
import '../../src/branding/upclick.css';
import '../../src/i18n/i18n';

Object.assign(window,{ __appearance: (theme: 'light'|'dark', language: 'en'|'ar') => { if(store.getState().ui.theme !== theme) store.dispatch(toggleTheme()); store.dispatch(setLanguage(language)); } });
const login = new URLSearchParams(location.search).has('login');
createRoot(document.getElementById('root')!).render(<Provider store={store}><ThemeProvider><MemoryRouter initialEntries={['/auth/login']}><Routes><Route path="/auth/login" element={login ? <LoginPage/> : <WorkspaceSkeleton variant="spinner" fullScreen/>}/><Route path="/" element={<h1>Landing page destination</h1>}/></Routes></MemoryRouter></ThemeProvider></Provider>);
