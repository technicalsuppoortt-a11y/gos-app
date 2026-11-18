import { lazy } from 'react';
import type { AppMode } from '../data/types';
import { BuilderPage as EagerBuilderPage } from './BuilderPage';
import { DashboardPage as EagerDashboardPage } from './DashboardPage';

const loaders = {
  wizard: () => import('./WizardPage').then(module => ({ default: module.WizardPage })),
  builder: () => Promise.resolve({ default: EagerBuilderPage }),
  dashboard: () => Promise.resolve({ default: EagerDashboardPage }),
};
const loadBranding = () => import('../components/brandengine/BrandingStudio').then(module => ({ default: module.BrandingStudio }));
const loadDeployment = () => import('../components/brandengine/PlatformDeployment').then(module => ({ default: module.PlatformDeployment }));

export const WizardPage = lazy(loaders.wizard);
export const BuilderPage = EagerBuilderPage;
export const DashboardPage = EagerDashboardPage;

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
    loaders.wizard(), loadBranding(), loadDeployment(),
  ]);
}
