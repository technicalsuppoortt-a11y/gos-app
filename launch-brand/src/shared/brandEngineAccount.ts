export type BrandEngineStatus = 'checking' | 'provisioned' | 'unprovisioned' | 'unavailable';
type Stop = () => void;
export type BrandEngineIdentity = { uid: string; email?: string | null };
export interface BrandEngineAccountPorts {
  listenUser: (uid: string, next: (document: { exists: boolean; isBrandEngineProvisioned?: boolean }) => void, error: () => void) => Stop;
}
export function brandLaunchLabel(status: BrandEngineStatus, language: string, deployed = false): string {
  if (deployed) return language === 'ar' ? 'افتح منصتك' : 'Open your platform';
  if (status === 'provisioned') return language === 'ar' ? 'متابعة بناء البراند' : 'Continue Launch Your Brand';
  return language === 'ar' ? 'بناء البراند' : 'Launch Your Brand';
}
export function observeBrandEngineAccount(user: BrandEngineIdentity, ports: BrandEngineAccountPorts, report: (status: BrandEngineStatus, documentUid?: string) => void): Stop {
  let stopped = false;
  report('checking');
  const stop = ports.listenUser(user.uid, document => {
    if (!stopped) report(document.exists && document.isBrandEngineProvisioned === true ? 'provisioned' : 'unprovisioned', user.uid);
  }, () => { if (!stopped) report('unavailable'); });
  return () => { stopped = true; stop(); };
}
