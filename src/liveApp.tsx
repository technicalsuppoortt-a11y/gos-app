import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './layout-shell.css';
import './global-controls.css';
import './i18n/rtl.css';
import './theme-surfaces.css';
import './theme-controls.css';
import './light-contrast.css';
import './control-polish.css';
import './module-updates.css';
import './branding/upclick.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
