export const loadBrandWorkspace = () => import('../modules/brand-engine/BrandEngineModule');

export function preloadBrandWorkspace() {
  void loadBrandWorkspace().then(() => import('../modules/brand-engine/pages/workspacePages'))
    .then(module => module.preloadWorkspacePage()).catch(() => undefined);
}

// Start after the signed-in Phoenix screen has had time to paint. The same
// account-scoped request is consumed by Launch Brand instead of reading twice.
export function warmBrandWorkspaceAfterLogin(uid: string) {
  let cancelled = false;
  let clearDraftCache: (() => void) | undefined;
  const timer = window.setTimeout(() => {
    void loadBrandWorkspace().then(async () => {
      if (cancelled) return;
      const [pages, drafts] = await Promise.all([
        import('../modules/brand-engine/pages/workspacePages'),
        import('../modules/brand-engine/services/brandDraft'),
      ]);
      clearDraftCache = drafts.clearPrefetchedBrandDraft;
      if (cancelled) return;
      await Promise.allSettled([pages.preloadAllWorkspacePages(), drafts.prefetchBrandDraft(uid)]);
    }).catch(() => undefined);
  }, 500);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    clearDraftCache?.();
  };
}
