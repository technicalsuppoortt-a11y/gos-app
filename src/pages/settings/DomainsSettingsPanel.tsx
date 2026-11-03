import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localizeNode, useUILanguage } from '../../i18n/display';
import { useAssetWorkspace } from '../asset-store';
import type { Asset, Dialog } from '../asset-model';
import { DomainsView } from '../AssetViews';
import { AssetDialog } from '../AssetDialog';
import '../funnel-builder.css';
import '../asset-workspace.css';
import '../asset-controls.css';
import '../domains-polish.css';
import '../funnel-polish.css';
import '../website-funnel-polish.css';

export function DomainsSettingsPanel() {
  useUILanguage();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useAssetWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Status');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const updateAsset = (id: string, update: (value: Asset) => Asset) =>
    setWorkspace(current => ({
      ...current,
      assets: current.assets.map(item => (item.id === id ? update(item) : item)),
    }));

  const go = (target: string) => {
    if (target === 'domains') {
      navigate('/dashboard/settings/domains');
      return;
    }
    navigate(`/dashboard/${target.replace(/^\/+/, '')}`);
  };

  return (
    <div className="aw-workspace aw-domains-workspace w-full">
      {localizeNode(
        <DomainsView
          workspace={workspace}
          setWorkspace={setWorkspace}
          query={query}
          setQuery={setQuery}
          status={status}
          setStatus={setStatus}
          go={go}
          open={setDialog}
        />
      )}
      {localizeNode(
        dialog && (
          <AssetDialog
            key={`${dialog.type}-${dialog.assetId}-${dialog.pageId}-${dialog.domainId}`}
            dialog={dialog}
            kind="funnel"
            workspace={workspace}
            setWorkspace={setWorkspace}
            updateAsset={updateAsset}
            close={() => setDialog(null)}
            go={go}
            section="domains"
            selected={() => {}}
          />
        )
      )}
    </div>
  );
}
