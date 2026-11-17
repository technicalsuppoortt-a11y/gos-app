import { useState } from 'react';
import {
  ArrowRight,
  ExternalLink,
  Eye,
  LoaderCircle,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  GLOBAL_TEMPLATE_CATEGORIES,
  globalTemplateCategoryLabel,
  useGlobalFunnelTemplates,
  type LocalizedGlobalFunnelTemplate,
} from '../backend/globalFunnelTemplates';
import { createDefaultInactivePage, type FunnelTemplateCategory } from './funnel-systeme-model';
import type { BuilderDocument, BuilderPage, BuilderSection } from './BuilderWorkspace';
import type { PageTemplate } from './page-templates';
import { AssetAsyncButton } from './AssetAsyncButton';
import { StepTemplateThumbnail } from './StepTemplateThumbnail';
import { useUILanguage } from '../i18n/display';
import './pagefly-editor.css';
import './funnel-systeme.css';

function cloneWithFreshIds(sections: BuilderSection[]): BuilderSection[] {
  return sections.map(section => ({
    ...structuredClone(section),
    id: crypto.randomUUID(),
    children: section.children?.map(col => cloneWithFreshIds(col)),
  }));
}

/**
 * Strictly builds an isolated SINGLE-STEP funnel template (1 page, 1 step)
 * without bundling any extra multi-step funnel pages.
 */
export function buildPageTemplateFromStepTemplate(
  localized: LocalizedGlobalFunnelTemplate,
  ar: boolean
): PageTemplate {
  const stepOneId = crypto.randomUUID();
  const basePage = structuredClone(localized.page);

  const defaultPath =
    localized.category === 'Opt-in'
      ? '/opt-in'
      : localized.category === 'Order Form'
        ? '/order-form'
        : localized.category === 'Thank You'
          ? '/thank-you'
          : '/sales';

  const isolatedStep: BuilderPage = {
    ...basePage,
    id: stepOneId,
    name: localized.title,
    path: basePage.path || defaultPath,
    status: 'Draft',
    isFunnelStep: true,
    stepCategory: localized.category,
    templateSelected: true,
    sections: cloneWithFreshIds(basePage.sections || []),
  };

  const goalLabel =
    localized.category === 'Opt-in'
      ? 'Lead generation'
      : localized.category === 'Sales' || localized.category === 'Order Form'
        ? 'Sales'
        : 'Confirmation';

  const builderDocument: BuilderDocument = {
    pages: [isolatedStep],
    steps: [
      {
        id: stepOneId,
        label: isolatedStep.name,
        pageId: stepOneId,
        type: localized.category,
      },
    ],
    funnel: {
      name: localized.title,
      goal: goalLabel,
      goalType: localized.category === 'Opt-in' ? 'audience' : 'sell',
      funnelActive: true,
      audience: '',
      offer: localized.title,
      events: ['PageView', 'Lead'],
      status: 'Draft',
      pagesFlow: [stepOneId],
    },
    inactivePage: createDefaultInactivePage(localized.title),
    theme: {
      color: localized.color || '#6366f1',
      font: ar ? 'Cairo' : 'Inter',
      corners: 'Rounded',
    },
  };

  return {
    id: localized.id,
    name: localized.title,
    mode: 'funnel',
    industry: 'Single Step Template',
    goal: goalLabel,
    color: localized.color || '#6366f1',
    image: isolatedStep.featuredImage || localized.thumbnail || '/dashboard/hero-landscape.png',
    thumbnail: localized.thumbnail,
    title: localized.title,
    body: localized.description,
    description: localized.description,
    cta: ar ? 'استخدم قالب الخطوة' : 'Use Step Template',
    benefits: [],
    builderDocument,
  };
}

export function UserStepTemplatesCatalog({
  install,
}: {
  install: (template: PageTemplate) => void | Promise<unknown>;
}) {
  const lang = useUILanguage();
  const ar = lang.startsWith('ar');
  const locale = ar ? 'ar' : 'en';
  const t = (en: string, arabic: string) => (ar ? arabic : en);

  const { templates, loading, error } = useGlobalFunnelTemplates({ includeDrafts: false });
  const [stepCat, setStepCat] = useState<'All' | FunnelTemplateCategory>('All');
  const [search, setSearch] = useState('');

  const filtered = templates.filter(tpl => {
    const matchCat = stepCat === 'All' || tpl.category === stepCat;
    const matchSearch =
      !search.trim() ||
      `${tpl.title} ${tpl.description} ${tpl.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="sys-user-step-catalog" dir={ar ? 'rtl' : 'ltr'}>
      <div className="pf-template-filters" style={{ marginBottom: 18 }}>
        <label>
          <Search size={15} />
          <input
            aria-label={t('Search step templates', 'ابحث في قوالب الخطوات')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(
              'Search isolated step templates (Opt-in, Sales, Order Form, Thank You)...',
              'ابحث في قوالب الخطوات المستقلة (الاشتراك، المبيعات، الطلب، الشكر)...'
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                border: 0,
                background: 'transparent',
                padding: 2,
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
              }}
              title={t('Clear search', 'مسح البحث')}
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div
          className="sys-step-cat-pills"
          role="group"
          aria-label={t('Step template category', 'فئة قالب الخطوة')}
        >
          <button
            type="button"
            aria-pressed={stepCat === 'All'}
            className={`sys-step-cat-pill ${stepCat === 'All' ? 'active' : ''}`}
            onClick={() => setStepCat('All')}
          >
            {t('All Steps', 'كل الخطوات')} ({templates.length})
          </button>
          {GLOBAL_TEMPLATE_CATEGORIES.map(cat => {
            const count = templates.filter(item => item.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                data-step-cat={cat}
                aria-pressed={stepCat === cat}
                className={`sys-step-cat-pill ${stepCat === cat ? 'active' : ''}`}
                onClick={() => setStepCat(cat)}
              >
                {globalTemplateCategoryLabel(cat, ar)} ({count})
              </button>
            );
          })}
        </div>

        {(search || stepCat !== 'All') && (
          <button
            type="button"
            className="pf-clear-filters-btn"
            onClick={() => {
              setSearch('');
              setStepCat('All');
            }}
          >
            <RotateCcw size={13} />
            <span>{t('Reset', 'إعادة ضبط')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <p role="status">{t('Loading step templates…', 'جارٍ تحميل قوالب الخطوات…')}</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="pf-empty-copy">
          {t('No step templates match these filters.', 'لا توجد قوالب خطوات مطابقة لهذه الفلاتر.')}
        </p>
      ) : (
        <div className="pf-template-library sys-step-portrait-grid">
          {filtered.map(tpl => {
            const previewHref = `/template-preview/${encodeURIComponent(tpl.id)}?${new URLSearchParams({
              source: 'step',
              lang: locale,
            })}`;
            return (
              <article
                key={tpl.id}
                className="pf-template-entry has-template-design sys-tpl-card sys-step-portrait-card"
                data-template-id={tpl.id}
                data-template-category={tpl.category}
              >
                <div className="pf-template-design-cover sys-step-cover-wrap">
                  <StepTemplateThumbnail tpl={tpl} language={locale} />
                  <span
                    className="sys-step-floating-badge"
                    style={{ backgroundColor: tpl.color || '#4f46e5' }}
                  >
                    {globalTemplateCategoryLabel(tpl.category, ar)}
                  </span>
                </div>

                <AssetAsyncButton
                  busyText={t('Creating...', 'جارٍ الإنشاء...')}
                  className="pf-template-card sys-use-inline"
                  data-step-template-id={tpl.id}
                  onClick={() => install(buildPageTemplateFromStepTemplate(tpl, ar))}
                  aria-label={`${t('Use', 'استخدم')} ${tpl.title}`}
                >
                  {busy => (
                    <div className="pf-template-description">
                      <b>{tpl.title}</b>
                      <small>
                        {t('Isolated Single Step', 'قالب خطوة مستقلة')} ·{' '}
                        {globalTemplateCategoryLabel(tpl.category, ar)}
                      </small>
                      {tpl.description && (
                        <p className="sys-step-card-desc">{tpl.description}</p>
                      )}
                      <span>
                        {busy ? (
                          <>
                            <LoaderCircle size={12} className="animate-spin" />
                            {t('Creating...', 'جارٍ الإنشاء...')}
                          </>
                        ) : (
                          <>
                            {t('Use Step Template ', 'استخدم قالب الخطوة ')}
                            <ArrowRight size={12} />
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </AssetAsyncButton>

                <a
                  className="pf-template-preview-action sys-step-preview-link"
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t('Preview', 'معاينة')} · ${tpl.title}`}
                >
                  <Eye size={15} />
                  <span>{t('Preview', 'معاينة')}</span>
                  <ExternalLink size={12} />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
