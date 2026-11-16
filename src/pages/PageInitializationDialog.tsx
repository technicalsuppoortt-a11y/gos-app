import { AssetAsyncButton } from './AssetAsyncButton';
import { useUILanguage, translateText, localizeNode } from '../i18n/display';
import { useState } from 'react';
import { ArrowRight, File, LayoutGrid, Sparkles } from 'lucide-react';
import { Modal } from './settings/kit';
import { createPageAsset } from './page-templates';
import { AIWebsiteDialog } from './AIWebsiteDialog';
import { PageTemplateLibrary } from './PageTemplateLibrary';
import { CreateFunnelModal } from './CreateFunnelModal';
import type { PageTemplate } from './page-templates';
import type { Asset, BuilderMode, Domain } from './asset-model';
import './pagefly-editor.css';

export function PageInitializationDialog({
  kind,
  domains,
  close,
  create,
}: {
  kind: BuilderMode;
  domains?: Domain[];
  close: () => void;
  create: (asset: Asset, openWorkspace?: boolean) => void | Promise<unknown>;
}) {
  useUILanguage();
  const [choice, setChoice] = useState<'blank' | 'template' | 'ai'>('blank');
  const [name, setName] = useState('');

  if (kind === 'funnel') {
    return <CreateFunnelModal domains={domains} close={close} onCreate={create} />;
  }

  const install = (template?: PageTemplate) => create(createPageAsset(kind, name, template));
  if (choice === 'ai') return <AIWebsiteDialog kind={kind} close={() => setChoice('blank')} onCreate={create} />;
  return (
    <Modal title={translateText('Create a new page')} close={close}>
      <div className="pf-initialization">
        <p>{translateText('Start fresh or choose a professionally designed template.')}</p>
        <label className="pf-page-name">
          {localizeNode('Page name')}
          <input
            maxLength={100}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={translateText('Untitled page')}
          />
        </label>
        <div className="pf-start-options" role="tablist" aria-label={translateText('Page starting point')}>
          <button
            role="tab"
            aria-label={translateText('Blank page')}
            aria-selected={choice === 'blank'}
            className={choice === 'blank' ? 'selected' : ''}
            onClick={() => setChoice('blank')}
          >
            <File size={24} />
            <b>{translateText('Blank page')}</b>
            <span>{translateText('Build from a clean canvas.')}</span>
          </button>
          <button
            role="tab"
            aria-label={translateText('Template')}
            aria-selected={choice === 'template'}
            className={choice === 'template' ? 'selected' : ''}
            onClick={() => setChoice('template')}
          >
            <LayoutGrid size={24} />
            <b>{translateText('Template')}</b>
            <span>{translateText('Start with a ready-to-edit design.')}</span>
          </button>
          <button
            role="tab"
            aria-selected={false}
            className="pf-ai-choice"
            onClick={() => setChoice('ai')}
          >
            <Sparkles size={24} />
            <b>{translateText('Create with AI')}</b>
            <span>{translateText('Build a personalized layout from your business brief.')}</span>
          </button>
        </div>
        {localizeNode(
          choice === 'blank' ? (
            <footer>
              <button className="aw-secondary" onClick={close}>
                {translateText('Cancel')}
              </button>
              <AssetAsyncButton className="aw-primary" busyText="Creating..." onClick={() => install()}>
                {translateText('Create blank page ')}
                <ArrowRight size={14} />
              </AssetAsyncButton>
            </footer>
          ) : (
            <PageTemplateLibrary initialCategory="Websites" install={install} />
          )
        )}
      </div>
    </Modal>
  );
}
