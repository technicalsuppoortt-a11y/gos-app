import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LaunchBrandPage from '../pages/LaunchBrandPage';
import AppNotifications from '../components/AppNotifications';
import { useStore } from '../store/useStore';
import OpenFromAcademy from './OpenFromAcademy';
import { JOE_ACADEMY_ORIGIN } from './config';
import AdminSettingsHost from './AdminSettingsHost';

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

function ThemeClass() {
  const theme = useStore(state => state.theme);
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  }, [theme]);
  return null;
}

/**
 * Only /launch-brand belongs to this app. Every other path that the original
 * page links to ("/" = Back to Dashboard, "/auth", "/admin") is Joe Academy's.
 */
export default function LaunchBrandHost() {
  const theme = useStore(state => state.theme);
  const language = useStore(state => state.language);
  return <BrowserRouter>
    <ThemeClass />
    <AppNotifications theme={theme} language={language} />
    <Routes>
      <Route path="/launch-brand" element={<LaunchBrandPage />} />
      <Route path="/launch-brand/admin-settings" element={<AdminSettingsHost />} />
      <Route path="/" element={<ExternalRedirect to={`${JOE_ACADEMY_ORIGIN}/dashboard`} />} />
      <Route path="*" element={<OpenFromAcademy />} />
    </Routes>
  </BrowserRouter>;
}
