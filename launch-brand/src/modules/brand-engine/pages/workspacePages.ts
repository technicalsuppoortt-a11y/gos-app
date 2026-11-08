import { lazy } from 'react';
import type { AppMode } from '../data/types';

const loaders = {
  wizard: () => import('./WizardPage').then(module => ({ default: module.WizardPage })),
  builder: () => import('./BuilderPage').then(module => ({ default: module.BuilderPage })),
  dashboard: () => import('./DashboardPage').then(module => ({ default: module.DashboardPage })),
};
const loadBranding = () => import('../components/brandengine/BrandingStudio').then(module => ({ default: module.BrandingStudio }));
const loadDeployment = () => import('../components/brandengine/PlatformDeployment').then(module => ({ default: module.PlatformDeployment }));

export const WizardPage = lazy(loaders.wizard);
export const BuilderPage = lazy(loaders.builder);
export const DashboardPage = lazy(loaders.dashboard);

// Start code loading alongside the draft request, before the shell mounts.
// A failed preload is retried by React.lazy when the page is rendered.
export function preloadWorkspacePage(mode: AppMode = 'wizard', step = 13) {
  void loaders[mode]().catch(() => undefined);
  if (mode === 'wizard' && (step === 14 || step === 18))
    void loadBranding().catch(() => undefined);
  if (mode === 'wizard' && step === 18)
    void loadDeployment().catch(() => undefined);
}

export function preloadAllWorkspacePages() {
  return Promise.allSettled([
    loaders.wizard(), loadBranding(), loaders.dashboard(), loaders.builder(), loadDeployment(),
  ]);
}
