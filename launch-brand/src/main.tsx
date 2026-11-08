import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n';
import LaunchBrandHost from './host/LaunchBrandHost'
import { startLaunchBrandSession } from './host/session'

// gos-app host for Launch Brand. Joe Academy's own App shell is not copied:
// this file only signs the user in from their Joe Academy ticket and renders
// the original /launch-brand page.
if (!window.location.pathname.startsWith('/launch-brand/admin-settings')) startLaunchBrandSession();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LaunchBrandHost />
  </StrictMode>,
)
