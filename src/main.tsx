import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installChunkRecovery } from './router/chunkRecovery';
import App from './App.tsx';
import './index.css';
import './layout-shell.css';
import './global-controls.css';

installChunkRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
