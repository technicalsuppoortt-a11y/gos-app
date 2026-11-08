import type { AppMode } from './types';

export const workspaceViews = {
  discover: { mode: 'wizard', step: 13 },
  branding: { mode: 'wizard', step: 14 },
  dashboard: { mode: 'dashboard', step: 5 },
  website: { mode: 'builder', step: 4 },
  deployment: { mode: 'wizard', step: 18 },
} as const;

export type WorkspaceView = keyof typeof workspaceViews;

export function readWorkspaceView(search: string): WorkspaceView | null {
  const view = new URLSearchParams(search).get('view');
  return view && Object.hasOwn(workspaceViews, view) ? view as WorkspaceView : null;
}

export function workspaceViewFromState({ mode, activeStep }: { mode: AppMode; activeStep: number }): WorkspaceView {
  if (mode === 'dashboard') return 'dashboard';
  if (mode === 'builder') return 'website';
  if (activeStep === 14) return 'branding';
  if (activeStep === 18) return 'deployment';
  return 'discover';
}

export function workspaceSearch(search: string, view: WorkspaceView): string {
  const params = new URLSearchParams(search);
  params.set('view', view);
  return `?${params.toString()}`;
}

export function isWorkspacePreview(view: WorkspaceView | null): boolean {
  return view === 'dashboard' || view === 'website';
}
