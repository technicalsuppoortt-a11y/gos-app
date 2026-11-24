import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Monitor, Smartphone, Tablet, ShieldCheck } from 'lucide-react';
import type { BuilderDocument } from '../BuilderWorkspace';
import type { Asset } from '../asset-model';
import { PagePreview } from '../AssetViews';
import { useUILanguage, translateText } from '../../i18n/display';
import { AdminSelect } from './AdminSelect';
import { LiveDialog } from './AdminLiveUI';
import { TemplateDesign, templateDesktopWidth } from '../TemplateDesign';
import { localizeManagedTemplate, type ManagedTemplate } from './managed-template';
import '../asset-workspace.css';

export type SitePreview = {
  document: BuilderDocument;
  name: string;
  kind?: 'funnel' | 'website';
  domain?: string;
  image?: string;
  settings?: Asset['settings'];
  template?: Pick<Asset, 'formAsset' | 'templateDesign'>;
  templateRecord?: ManagedTemplate;
};

export function AdminSitePreview({ value, close }: { value: SitePreview; close: () => void }) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : translateText(en);
  return (
    <LiveDialog
      wide
      title={value.name}
      subtitle={t('Visual preview of the saved design', 'معاينة مرئية للتصميم المحفوظ')}
      close={close}
      footer={<AdminSitePreviewNote />}
    >
      <AdminSitePreviewCanvas value={value} />
    </LiveDialog>
  );
}

export function AdminSitePreviewNote() {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : translateText(en);
  return (
    <span className="alm-preview-note">
      <ShieldCheck size={14} />
      {t(
        'Supervisory preview · Forms, payments and booking actions are disabled.',
        'معاينة إشرافية · إجراءات النماذج والدفع والحجز معطلة.'
      )}
    </span>
  );
}

/** Page selector, EN/AR language switch, device switch and scaled canvas, shared by the dialog and the full-page preview. */
export function AdminSitePreviewCanvas({ value }: { value: SitePreview }) {
  const ar = useUILanguage().startsWith('ar'), t = (en: string, arabic: string) => ar ? arabic : translateText(en);
  const [previewLang, setPreviewLang] = useState<'en' | 'ar'>(ar ? 'ar' : 'en');
  const localizedRecord = useMemo(
    () => (value.templateRecord ? localizeManagedTemplate(value.templateRecord, previewLang === 'ar') : undefined),
    [value.templateRecord, previewLang]
  );
  const activeDoc = localizedRecord?.builderDocument || value.document;
  const activeDesign = localizedRecord ? localizedRecord.design : value.template?.templateDesign;
  const activeName = localizedRecord?.name || value.name;

  const [pageId, setPageId] = useState(activeDoc.pages[0]?.id);
  const [device, setDevice] = useState<'Desktop' | 'Tablet' | 'Mobile'>('Desktop');
  const viewport = useRef<HTMLDivElement>(null), canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 600 });
  const page = activeDoc.pages.find(item => item.id === pageId) || activeDoc.pages[0];
  const width = device === 'Desktop' ? (value.template ? templateDesktopWidth : 1200) : device === 'Tablet' ? 768 : 390;

  useLayoutEffect(() => {
    if (!viewport.current || !canvas.current) return;
    const measure = () => {
      const scale = Math.min(1, Math.max(240, viewport.current!.clientWidth - 32) / width);
      const height = canvas.current!.scrollHeight * scale;
      setSize(current =>
        Math.abs(current.scale - scale) < 0.001 && Math.abs(current.height - height) < 1
          ? current
          : { scale, height }
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(canvas.current);
    measure();
    return () => observer.disconnect();
  }, [width, pageId, previewLang]);

  const asset = {
    ...value,
    ...value.template,
    templateDesign: activeDesign,
    document: activeDoc,
    name: activeName,
    id: 'admin-supervisory-preview',
    kind: value.kind || (activeDoc.steps?.length ? 'funnel' : 'website'),
    domain: value.domain || '',
    image: value.image || '/dashboard/hero-landscape.png',
    description: '',
    updated: '',
    settings: value.settings || {
      color: activeDoc.theme?.color || '#7C3AED',
      navigation: activeDoc.pages.map(p => p.name).join(', '),
      seo: activeName,
    },
  } as Asset;

  return (
    <>
      {page ? (
        <>
          <div className="alm-preview-toolbar">
            <AdminSelect
              label={t('Preview page', 'صفحة المعاينة')}
              value={page.id}
              onChange={setPageId}
              options={activeDoc.pages.map(p => ({ value: p.id, label: p.name }))}
            />
            {value.template && (
              <div
                className="alm-device-switch"
                role="group"
                aria-label={t('Template language', 'لغة القالب')}
              >
                <button
                  type="button"
                  aria-pressed={previewLang === 'en'}
                  onClick={() => setPreviewLang('en')}
                >
                  <span>English (LTR)</span>
                </button>
                <button
                  type="button"
                  aria-pressed={previewLang === 'ar'}
                  onClick={() => setPreviewLang('ar')}
                >
                  <span>Arabic (RTL)</span>
                </button>
              </div>
            )}
            <div
              className="alm-device-switch"
              role="group"
              aria-label={t('Preview viewport', 'حجم المعاينة')}
            >
              {(
                [
                  { name: 'Desktop', Icon: Monitor },
                  { name: 'Tablet', Icon: Tablet },
                  { name: 'Mobile', Icon: Smartphone },
                ] as const
              ).map(({ name, Icon }) => (
                <button
                  type="button"
                  aria-label={`${name} preview`}
                  aria-pressed={device === name}
                  key={name}
                  onClick={() => setDevice(name)}
                >
                  <Icon size={16} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <span className="alm-preview-width">{width}px</span>
          </div>
          <div className="alm-preview-viewport" ref={viewport}>
            <div
              className="alm-preview-measure"
              style={{ width: width * size.scale, height: size.height }}
            >
              <div
                ref={canvas}
                className="alm-preview-canvas"
                style={{ width, transform: `scale(${size.scale})` }}
                inert
              >
                {value.template ? (
                  <TemplateDesign
                    asset={asset}
                    pageId={page.id}
                    width={width}
                    device={device === 'Desktop' ? undefined : (device.toLowerCase() as 'tablet' | 'mobile')}
                    language={previewLang}
                  />
                ) : (
                  <PagePreview
                    asset={asset}
                    page={page}
                    device={device}
                    onNavigate={() => {}}
                    isDark={false}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="alm-empty-copy">
          {t('This record has no saved pages to preview.', 'لا يحتوي هذا السجل على صفحات محفوظة للمعاينة.')}
        </p>
      )}
    </>
  );
}
