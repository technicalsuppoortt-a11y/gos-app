import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installChunkRecovery } from './router/chunkRecovery';
import App from './App.tsx';
import './index.css';
import './layout-shell.css';
import './global-controls.css';
import './i18n/rtl.css';
import './theme-surfaces.css';
import './theme-controls.css';
import './module-updates.css';

installChunkRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
