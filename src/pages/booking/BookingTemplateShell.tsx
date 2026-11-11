import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, Globe2, Layers, MapPin, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { localizeNode, translateText, useUILanguage } from '../../i18n/display';
import { createPageAsset, pageTemplates, type PageTemplate } from '../page-templates';
import { readWorkspace, type Asset, type Workspace } from '../asset-model';
import { useAssetWorkspace } from '../asset-store';
import { bookingColor, type BookingPage } from './model';

export type BookingConnectedDesign = {
  id: string;
  rawId: string;
  source: 'workspace' | 'template';
  kind: 'website' | 'funnel';
  name: string;
  title: string;
  subtitle: string;
  cta: string;
  color: string;
  image: string;
  industry: string;
  benefits: string[];
  template?: PageTemplate;
  asset?: Asset;
};

function assetToDesign(asset: Asset): BookingConnectedDesign {
  const firstPage = asset.document?.pages?.[0];
  const heroSec = firstPage?.sections?.find(s => s.type === 'Hero' || s.type === 'Heading');
  const highlightsSec = firstPage?.sections?.find(s =>
    ['Program Highlights', 'Core Values', 'Program Cards', 'Stats'].includes(s.type)
  );
  const rawItems = highlightsSec?.content?.items || '';
  const parsedBenefits = rawItems
    .split(/[·|,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: `asset:${asset.id}`,
    rawId: asset.id,
    source: 'workspace',
    kind: asset.kind === 'website' ? 'website' : 'funnel',
    name: asset.name || 'Untitled Website',
    title: heroSec?.content?.title || firstPage?.headline || asset.name || 'Book Your Session',
    subtitle:
      heroSec?.content?.body ||
      firstPage?.subheadline ||
      asset.description ||
      'Choose a convenient date and time with our team.',
    cta: heroSec?.content?.button || firstPage?.cta || 'Schedule Now',
    color: asset.document?.theme?.color || asset.settings?.color || '#2563EB',
    image: firstPage?.featuredImage || asset.image || '/dashboard/product-consultation.png',
    industry: asset.kind === 'website' ? 'Workspace Website' : 'Workspace Funnel',
    benefits:
      parsedBenefits.length > 0
        ? parsedBenefits
        : ['Personalized 1-on-1 session', 'Instant calendar confirmation', 'Flexible rescheduling'],
    asset,
  };
}

function templateToDesign(tpl: PageTemplate): BookingConnectedDesign {
  return {
    id: `tpl:${tpl.id}`,
    rawId: tpl.id,
    source: 'template',
    kind: tpl.mode === 'funnel' ? 'funnel' : 'website',
    name: tpl.name,
    title: tpl.title || tpl.name,
    subtitle: tpl.body || 'Choose a time that works best for your schedule.',
    cta: tpl.cta || 'Book Consultation',
    color: tpl.color || '#2563EB',
    image: tpl.thumbnail || tpl.image || '/dashboard/product-consultation.png',
    industry: tpl.industry || 'Business',
    benefits:
      tpl.benefits && tpl.benefits.length > 0
        ? tpl.benefits.slice(0, 3)
        : ['Tailored around your goals', 'Guided by experienced specialists', 'Simple online scheduling'],
    template: tpl,
  };
}

export function useBookingWebsiteAndTemplateCatalog() {
  const [workspace, setWorkspace] = useAssetWorkspace();

  const workspaceDesigns: BookingConnectedDesign[] = React.useMemo(() => {
    const assets = (workspace?.assets?.length ? workspace.assets : readWorkspace().assets).filter(
      a => a && !a.formAsset && !a.archived
    );
    return assets.map(assetToDesign);
  }, [workspace?.assets]);

  const templateDesigns: BookingConnectedDesign[] = React.useMemo(() => {
    const byId = new Map<string, PageTemplate>();
    for (const item of pageTemplates) {
      if (item.mode === 'website' || item.mode === 'funnel') {
        byId.set(item.id, item);
      }
    }
    return [...byId.values()].map(templateToDesign);
  }, []);

  const allDesigns = React.useMemo(
    () => [...workspaceDesigns, ...templateDesigns],
    [workspaceDesigns, templateDesigns]
  );

  return {
    workspace,
    setWorkspace,
    workspaceDesigns,
    templateDesigns,
    allDesigns,
  };
}

export function resolveBookingDesign(
  page: BookingPage,
  allDesigns?: BookingConnectedDesign[]
): BookingConnectedDesign | null {
  const settings = page.templateSettings;
  if (!settings || settings.previewMode !== 'template' || !settings.previewTemplateId?.trim()) {
    return null;
  }
  const targetId = settings.previewTemplateId.trim();

  const list =
    allDesigns && allDesigns.length > 0
      ? allDesigns
      : [
          ...readWorkspace()
            .assets.filter(a => a && !a.formAsset && !a.archived)
            .map(assetToDesign),
          ...pageTemplates
            .filter(t => t.mode === 'website' || t.mode === 'funnel')
            .map(templateToDesign),
        ];

  const matched = list.find(
    d =>
      d.id === targetId ||
      d.rawId === targetId ||
      `tpl:${d.rawId}` === targetId ||
      `asset:${d.rawId}` === targetId ||
      d.name.toLowerCase() === targetId.toLowerCase()
  );
  if (matched) return matched;

  return {
    id: targetId,
    rawId: targetId.replace(/^(asset:|tpl:)/, ''),
    source: targetId.startsWith('asset:') ? 'workspace' : 'template',
    kind: settings.templateKind || 'website',
    name: settings.templateName || page.name || 'Custom Template',
    title: settings.templateTitle || page.titleOverride || page.name || 'Book Your Appointment',
    subtitle:
      settings.templateSubtitle ||
      page.description ||
      'Select a convenient date and time below to schedule your session.',
    cta: 'Schedule Session',
    color: settings.templateColor || bookingColor(page.color) || '#2563EB',
    image: settings.templateImage || page.image || '/dashboard/product-consultation.png',
    industry: settings.templateIndustry || 'Featured Layout',
    benefits:
      settings.templateBenefits && settings.templateBenefits.length > 0
        ? settings.templateBenefits
        : ['Personalized 1-on-1 session', 'Instant calendar confirmation', 'Flexible rescheduling'],
  };
}

export function applyDesignToTemplateSettings(
  current: BookingPage['templateSettings'],
  design: BookingConnectedDesign | null
): BookingPage['templateSettings'] {
  if (!design) {
    return {
      ...current,
      previewMode: 'default',
      previewTemplateId: '',
    };
  }
  return {
    ...current,
    previewMode: 'template',
    previewTemplateId: design.id,
    templateName: design.name,
    templateTitle: design.title,
    templateSubtitle: design.subtitle,
    templateColor: design.color,
    templateImage: design.image,
    templateIndustry: design.industry,
    templateKind: design.kind,
    templateBenefits: design.benefits,
  };
}

export async function syncBookingIntoWorkspaceWebsite({
  design,
  bookingPage,
  workspace,
  setWorkspace,
}: {
  design: BookingConnectedDesign;
  bookingPage: BookingPage;
  workspace: Workspace;
  setWorkspace: (update: React.SetStateAction<Workspace>) => Promise<unknown>;
}): Promise<Asset | null> {
  const bookingSectionContent = {
    title: bookingPage.titleOverride || bookingPage.name || 'Book Your Appointment',
    body: bookingPage.description || 'Choose a convenient date and time with our team.',
    sectionSubtitle: bookingPage.description || 'Choose a convenient date and time with our team.',
    calendarId: bookingPage.id,
    calendarSlug: bookingPage.slug,
    calendar: bookingPage.name,
    serviceType: `${bookingPage.name} · ${bookingPage.duration} min`,
    bookingThemeMode: 'page',
    button: 'Confirm booking',
    bookingMode: 'step',
  };

  if (design.source === 'workspace' && design.asset) {
    let updatedAsset: Asset | null = null;
    await setWorkspace(current => {
      const nextAssets = current.assets.map(item => {
        if (item.id !== design.rawId) return item;
        const cloned = structuredClone(item);
        const pages = cloned.document.pages || [];
        const targetPage =
          pages.find(p => p.sections?.some(s => s.type === 'Booking')) || pages[0];
        if (targetPage) {
          const existingBookingSec = targetPage.sections.find(s => s.type === 'Booking');
          if (existingBookingSec) {
            existingBookingSec.content = {
              ...existingBookingSec.content,
              ...bookingSectionContent,
            };
          } else {
            const newSecId = `section-booking-${bookingPage.id.slice(0, 8)}`;
            targetPage.sections.push({
              id: newSecId,
              type: 'Booking',
              content: bookingSectionContent,
              styles: {
                backgroundColor: '#ffffff',
                padding: '32',
                textAlign: 'Center',
                typography: 'Default',
                customCss: '',
                visibility: 'All devices',
                animation: 'None',
              },
            });
          }
        }
        cloned.updated = new Date().toISOString();
        updatedAsset = cloned;
        return cloned;
      });
      return { ...current, assets: nextAssets };
    });
    return updatedAsset;
  }

  if (design.source === 'template' && design.template) {
    const existingFromTpl = workspace.assets.find(
      a =>
        !a.formAsset &&
        !a.archived &&
        a.name.toLowerCase() === `${design.template!.name} — ${bookingPage.name}`.toLowerCase()
    );
    if (existingFromTpl) {
      return syncBookingIntoWorkspaceWebsite({
        design: assetToDesign(existingFromTpl),
        bookingPage,
        workspace,
        setWorkspace,
      });
    }
    const created = createPageAsset(
      design.template.mode === 'funnel' ? 'funnel' : 'website',
      `${design.template.name} — ${bookingPage.name}`,
      design.template
    );
    for (const p of created.document.pages) {
      for (const s of p.sections) {
        if (s.type === 'Booking') {
          s.content = { ...s.content, ...bookingSectionContent };
        }
      }
    }
    const hasBookingSection = created.document.pages.some(p =>
      p.sections.some(s => s.type === 'Booking')
    );
    if (!hasBookingSection && created.document.pages[0]) {
      const bookingSecId = `section-booking-${bookingPage.id.slice(0, 8)}`;
      const targetPage = created.document.pages[0];
      const faqIdx = targetPage.sections.findIndex(s => s.type === 'FAQ');
      const bookingSection = {
        id: bookingSecId,
        type: 'Booking' as const,
        content: bookingSectionContent,
        styles: {
          backgroundColor: '#ffffff',
          padding: '32',
          textAlign: 'Center',
          typography: 'Default',
          customCss: '',
          visibility: 'All devices',
          animation: 'None',
        },
      };
      if (faqIdx >= 0) {
        targetPage.sections.splice(faqIdx, 0, bookingSection);
      } else {
        targetPage.sections.push(bookingSection);
      }
      const hero = targetPage.sections.find(s => s.type === 'Hero');
      if (hero) {
        hero.content.destinationType = 'Scroll to Section';
        hero.content.destination = bookingSecId;
      }
    }
    await setWorkspace(current => ({
      ...current,
      assets: [created, ...current.assets],
    }));
    return created;
  }

  return null;
}

export function BookingTemplateShell({
  page,
  design,
  compact = false,
  children,
}: {
  page: BookingPage;
  design: BookingConnectedDesign;
  compact?: boolean;
  children: React.ReactNode;
}) {
  useUILanguage();
  const accentColor = design.color || bookingColor(page.color) || '#2563EB';
  const scrollToWidget = () => {
    const el = document.getElementById(`bk-tpl-anchor-${page.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`bk-tpl-shell ${compact ? 'is-compact' : ''}`}
      style={
        {
          '--booking-color': accentColor,
          '--bk-tpl-accent': accentColor,
        } as React.CSSProperties
      }
    >
      {/* Top Website / Template Navigation Header */}
      <header className="bk-tpl-navbar">
        <div className="bk-tpl-brand">
          <span className="bk-tpl-brand-dot" style={{ background: accentColor }}>
            {design.kind === 'website' ? <Globe2 size={14} /> : <Layers size={14} />}
          </span>
          <div>
            <b>{localizeNode(design.name)}</b>
            <small>{localizeNode(design.industry)}</small>
          </div>
        </div>
        {!compact && (
          <nav className="bk-tpl-navlinks" aria-label={translateText('Template navigation')}>
            <button type="button" onClick={scrollToWidget}>
              {translateText('Overview')}
            </button>
            <button type="button" onClick={scrollToWidget}>
              {translateText('Why Choose Us')}
            </button>
            <button type="button" onClick={scrollToWidget}>
              {translateText('Schedule')}
            </button>
          </nav>
        )}
        <button
          type="button"
          className="bk-tpl-cta-pill"
          style={{ background: accentColor }}
          onClick={scrollToWidget}
        >
          <CalendarDays size={13} />
          <span>{localizeNode(design.cta || 'Book Now')}</span>
        </button>
      </header>

      {/* Hero Section Harmonized with Template */}
      <section className="bk-tpl-hero">
        <div className="bk-tpl-hero-copy">
          <span className="bk-tpl-eyebrow">
            <Sparkles size={12} />
            {localizeNode(design.industry)} · {localizeNode(page.duration)} {translateText('min')}
          </span>
          <h1>{localizeNode(design.title || page.titleOverride || page.name)}</h1>
          <p>{localizeNode(design.subtitle || page.description)}</p>
          <div className="bk-tpl-hero-benefits">
            {design.benefits.map((benefit, idx) => (
              <span key={idx} className="bk-tpl-benefit-chip">
                <CheckCircle2 size={13} style={{ color: accentColor }} />
                {localizeNode(benefit)}
              </span>
            ))}
          </div>
        </div>
        {design.image && (
          <div className="bk-tpl-hero-media">
            <img src={design.image} alt={design.name} loading="lazy" />
          </div>
        )}
      </section>

      {/* Embedded Koalendar Booking Section */}
      <section id={`bk-tpl-anchor-${page.id}`} className="bk-tpl-booking-section">
        <div className="bk-tpl-section-head">
          <div className="bk-tpl-section-badges">
            <span>
              <Clock3 size={12} />
              {localizeNode(page.duration)} {translateText('min')}
            </span>
            <span>
              <MapPin size={12} />
              {localizeNode(page.location)}
            </span>
            <span>
              <ShieldCheck size={12} />
              {translateText('Instant Confirmation')}
            </span>
          </div>
          <h2>{localizeNode(page.titleOverride || page.name)}</h2>
          {page.description && <p>{localizeNode(page.description)}</p>}
        </div>

        <div className="bk-tpl-widget-wrap">{children}</div>
      </section>

      {/* Template Highlights & Social Proof */}
      <section className="bk-tpl-highlights">
        <div className="bk-tpl-highlights-grid">
          {design.benefits.map((benefit, idx) => (
            <article key={idx} className="bk-tpl-highlight-card">
              <span className="bk-tpl-highlight-num" style={{ color: accentColor }}>
                0{idx + 1}
              </span>
              <h3>{localizeNode(benefit)}</h3>
              <p>
                {localizeNode(
                  [
                    'Designed around your goals with a clear, structured action plan.',
                    'Direct guidance from dedicated specialists focused on your results.',
                    'Flexible scheduling with automatic reminders and calendar sync.',
                  ][idx % 3]
                )}
              </p>
            </article>
          ))}
        </div>
        <div className="bk-tpl-trust-bar">
          <div className="bk-tpl-stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />
            ))}
          </div>
          <span>
            {translateText('Trusted scheduling powered by')} <b>{localizeNode(design.name)}</b>
          </span>
        </div>
      </section>
    </div>
  );
}
