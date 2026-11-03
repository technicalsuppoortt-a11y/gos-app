import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { useUILanguage } from '../../i18n/display';
import { BusinessAssets } from './BusinessAssets';
import './admin-workspace.css';
import '../settings/settings-controls.css';

export function BusinessAssetsPage() {
  const tenantId = useSelector((state: RootState) => state.auth.tenant?.id);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const role = useSelector((state: RootState) => state.auth.role);
  const ar = useUILanguage().startsWith('ar');
  const effectiveTenantId =
    tenantId || (role === 'ADMIN' || role === 'SUPER_ADMIN' ? userId || 'platform' : '');

  return (
    <div className="adm-workspace workspace-customization-panel">
      {effectiveTenantId ? (
        <BusinessAssets key={effectiveTenantId} tenantId={effectiveTenantId} />
      ) : (
        <p role="status">
          {ar ? 'اختر مساحة عمل لإدارة الملفات.' : 'Select a workspace to manage its assets.'}
        </p>
      )}
    </div>
  );
}
