import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { saveManagedTemplate } from '../../backend/adminManagement';
import { backendError } from '../../backend/firebase';
import { saveAdminTemplate, useManagedTemplatePreview, useTemplateLibrary, type OwnedTemplate } from '../../backend/templateOwnership';
import { useUILanguage } from '../../i18n/display';
import { isPlatformTeamRole } from '../../router/platformAccess';
import type { RootState } from '../../store';
import { adminTemplateCategories } from '../system-template-data';
import { AdminTemplateEditor, newManagedTemplate } from './AdminTemplateEditor';
import { AdminSitePreview, type SitePreview } from './AdminSitePreview';
import type { ManagedTemplate } from './managed-template';
import './admin-workspace.css';
import './admin-live.css';

export default function AdminTemplateEditorPage({ scope }: { scope: 'system' | 'mine' }) {
  const ar = useUILanguage().startsWith('ar');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const { templateId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { role, uid, impersonation } = useSelector((state: RootState) => ({
    role: state.auth.role, uid: state.auth.user?.id, impersonation: state.auth.impersonation,
  }), (a, b) => a.role === b.role && a.uid === b.uid && a.impersonation === b.impersonation);
  const permitted = !impersonation && (scope === 'system' ? isPlatformTeamRole(role) : role === 'ADMIN');
  const source = useManagedTemplatePreview(permitted ? templateId || '' : '', scope === 'mine' ? 'admin' : 'catalog');
  const presets = useTemplateLibrary(permitted ? scope === 'mine' ? 'general' : 'system' : null);
  const category = adminTemplateCategories.find(value => value === params.get('category'));
  const [blank] = useState(() => newManagedTemplate(category));
  const [preview, setPreview] = useState<SitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const back = scope === 'mine' ? '/admin/templates?library=mine' : '/super-admin/dashboard-management?library=system';
  if (!permitted) return <Navigate to={back} replace/>;
  const template = templateId ? source.template as OwnedTemplate | undefined : blank;
  const accessible = template && (!templateId || scope === 'system' || (template as OwnedTemplate).ownerUid === uid);

  async function save(value: ManagedTemplate) {
    if (saving.current) return t('A template is already saving.', 'جارٍ حفظ القالب.');
    saving.current = true;
    setBusy(true);
    try {
      await (scope === 'mine' ? saveAdminTemplate(value) : saveManagedTemplate(value));
      navigate(back, { replace: true, state: { templateSaved: true } });
      return null;
    } catch (error) {
      return backendError(error);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <div className={scope === 'system' ? 'adm-shell sa-templates' : undefined}>
    {accessible ? <AdminTemplateEditor key={`${uid}:${scope}:${template.id}`} template={template}
      presets={presets.templates} ownerUid={scope === 'mine' ? uid : undefined} busy={busy}
      close={() => navigate(back, { replace: true })} save={save} preview={setPreview}/> :
      <section className="adm-workspace adm-live">
        <div className="alm-page-head"><h1>{t('Edit template', 'تعديل القالب')}</h1></div>
        {source.loading ? <p role="status">{t('Loading template…', 'جارٍ تحميل القالب…')}</p> :
          <p role="alert">{source.error || t('Template unavailable.', 'القالب غير متاح.')}</p>}
        <div><Link className="alm-button" to={back}>{t('Back to templates', 'العودة إلى القوالب')}</Link></div>
      </section>}
    {preview && <AdminSitePreview value={preview} close={() => setPreview(null)}/>}
  </div>;
}
