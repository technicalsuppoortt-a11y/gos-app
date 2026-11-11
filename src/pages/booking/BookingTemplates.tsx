import { thumbnailImageProps } from '../../utils/thumbnailImages';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  Check,
  Globe,
  LayoutTemplate,
} from 'lucide-react';
import { blankPage, KEYS, normalizeBookingPage, readPages, slugify, write } from './model';
import type { BookingPage } from './model';
import { createBookingTemplate, type BookingTemplatePreset } from './template-presets';
import { useBookingTemplateCatalogState } from '../../backend/nativeTemplateCatalog';
import {
  applyDesignToTemplateSettings,
  syncBookingIntoWorkspaceWebsite,
  useBookingWebsiteAndTemplateCatalog,
  type BookingConnectedDesign,
} from './BookingTemplateShell';
import { BookingLivePreview } from './BookingLivePreview';
import { Modal } from './ui';
import './booking-workspace.css';

function createBookingPageFromDesign(design: BookingConnectedDesign): BookingPage {
  const base = blankPage();
  const pageName = `${design.name} Consultation`;
  return normalizeBookingPage({
    ...base,
    name: pageName,
    slug: `${slugify(pageName)}-${base.id.slice(0, 6)}`,
    titleOverride: design.title || pageName,
    description:
      design.subtitle ||
      `Book a personalized session for ${design.name}. Choose a convenient date and time below.`,
    color: design.color || base.color,
    image: design.image || base.image,
    duration: 30,
    durationOptions: [15, 30, 60],
    templateSettings: applyDesignToTemplateSettings(base.templateSettings, design),
  });
}

export function BookingTemplates() {
  useUILanguage();
  const navigate = useNavigate();
  const { templates, loading, error: catalogError } = useBookingTemplateCatalogState();
  const { workspaceDesigns, templateDesigns, workspace, setWorkspace } =
    useBookingWebsiteAndTemplateCatalog();
  const [category, setCategory] = useState<'all' | 'booking' | 'websites' | 'funnels'>('all');
  const [preview, setPreview] = useState<BookingPage | null>(null);
  const [error, setError] = useState('');

  const install = (template: BookingTemplatePreset) => {
    try {
      const page = createBookingTemplate(template);
      write(KEYS.pages, [...readPages(), page]);
      navigate(`/dashboard/booking/${encodeURIComponent(page.id)}/edit`);
    } catch {
      setError('Could not save this template. Browser storage may be full or unavailable.');
    }
  };

  const installDesign = (design: BookingConnectedDesign) => {
    try {
      const page = createBookingPageFromDesign(design);
      write(KEYS.pages, [...readPages(), page]);
      void syncBookingIntoWorkspaceWebsite({
        design,
        bookingPage: page,
        workspace,
        setWorkspace,
      });
      navigate(`/dashboard/booking/${encodeURIComponent(page.id)}/edit`);
    } catch {
      setError('Could not save this template. Browser storage may be full or unavailable.');
    }
  };

  const showBookingPresets = category === 'all' || category === 'booking';
  const showWorkspaceWebsites = category === 'all' || category === 'websites';
  const showFunnelTemplates = category === 'all' || category === 'funnels';

  return (
    <main className="bk-workspace bk-template-workspace">
      <Link className="bk-button bk-template-back" to="/dashboard/booking">
        <ArrowLeft size={15} />
        {translateText('Back to booking pages')}
      </Link>
      <header className="bk-page-heading">
        <div className="bk-heading-icon">
          <CalendarDays size={22} />
        </div>
        <div>
          <h1>{translateText('Booking templates')}</h1>
          <p>
            {translateText(
              'Start with a booking preset or connect any Website & Funnel template with a matching landing page UI.'
            )}
          </p>
        </div>
      </header>

      <div className="bk-subtabs" role="tablist" aria-label={translateText('Template categories')}>
        <button
          type="button"
          className={category === 'all' ? 'active' : ''}
          onClick={() => setCategory('all')}
        >
          {translateText('All Templates')}
          <span>{templates.length + workspaceDesigns.length + templateDesigns.length}</span>
        </button>
        <button
          type="button"
          className={category === 'websites' ? 'active' : ''}
          onClick={() => setCategory('websites')}
        >
          <Globe size={13} />
          {translateText('My Websites & Funnels')}
          <span>{workspaceDesigns.length}</span>
        </button>
        <button
          type="button"
          className={category === 'funnels' ? 'active' : ''}
          onClick={() => setCategory('funnels')}
        >
          <LayoutTemplate size={13} />
          {translateText('Website & Funnel Templates')}
          <span>{templateDesigns.length}</span>
        </button>
        <button
          type="button"
          className={category === 'booking' ? 'active' : ''}
          onClick={() => setCategory('booking')}
        >
          <CalendarDays size={13} />
          {translateText('Booking Presets')}
          <span>{templates.length}</span>
        </button>
      </div>

      {localizeNode(
        error && (
          <p role="alert" className="bk-error">
            {localizeNode(error)}
          </p>
        )
      )}
      {loading && <p role="status">{translateText('Loading templates…')}</p>}
      {catalogError && (
        <p role="alert" className="bk-error">
          {catalogError}
        </p>
      )}
      {!loading &&
        !catalogError &&
        !templates.length &&
        !workspaceDesigns.length &&
        !templateDesigns.length && (
          <p role="status">{translateText('No published booking templates are available.')}</p>
        )}

      <div className="bk-template-grid">
        {showWorkspaceWebsites &&
          localizeNode(
            workspaceDesigns.map(design => (
              <article className="bk-card bk-template-card" key={design.id}>
                <img
                  decoding="async"
                  {...thumbnailImageProps(design.image)}
                  src={design.image}
                  alt={translateText(`${design.name} website`)}
                  loading="lazy"
                />
                <div className="bk-template-content">
                  <div className="bk-template-meta">
                    <span className="bk-pill" style={{ color: design.color }}>
                      {translateText('My Website · ')}
                      {localizeNode(design.industry)}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      30{translateText(' min')}
                    </span>
                  </div>
                  <h2>{localizeNode(design.name)}</h2>
                  <p>{localizeNode(design.subtitle)}</p>
                  <ul>
                    {design.benefits.slice(0, 3).map((benefit, i) => (
                      <li key={i}>
                        <Check size={14} />
                        {localizeNode(benefit)}
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <button
                      className="bk-button"
                      onClick={() => setPreview(createBookingPageFromDesign(design))}
                    >
                      <Eye size={14} />
                      {translateText('Preview')}
                    </button>
                    <button className="bk-button primary" onClick={() => installDesign(design)}>
                      {translateText('Use template')}
                      <ArrowRight size={14} />
                    </button>
                  </footer>
                </div>
              </article>
            ))
          )}

        {showFunnelTemplates &&
          localizeNode(
            templateDesigns.map(design => (
              <article className="bk-card bk-template-card" key={design.id}>
                <img
                  decoding="async"
                  {...thumbnailImageProps(design.image)}
                  src={design.image}
                  alt={translateText(`${design.name} funnel template`)}
                  loading="lazy"
                />
                <div className="bk-template-content">
                  <div className="bk-template-meta">
                    <span className="bk-pill" style={{ color: design.color }}>
                      {localizeNode(design.industry)}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      30{translateText(' min')}
                    </span>
                  </div>
                  <h2>{localizeNode(design.name)}</h2>
                  <p>{localizeNode(design.subtitle)}</p>
                  <ul>
                    {design.benefits.slice(0, 3).map((benefit, i) => (
                      <li key={i}>
                        <Check size={14} />
                        {localizeNode(benefit)}
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <button
                      className="bk-button"
                      onClick={() => setPreview(createBookingPageFromDesign(design))}
                    >
                      <Eye size={14} />
                      {translateText('Preview')}
                    </button>
                    <button className="bk-button primary" onClick={() => installDesign(design)}>
                      {translateText('Use template')}
                      <ArrowRight size={14} />
                    </button>
                  </footer>
                </div>
              </article>
            ))
          )}

        {showBookingPresets &&
          localizeNode(
            templates.map(template => (
              <article className="bk-card bk-template-card" key={template.key}>
                <img
                  decoding="async"
                  {...thumbnailImageProps(template.image)}
                  src={template.image}
                  alt={translateText(`${template.category} booking page`)}
                  loading="lazy"
                />
                <div className="bk-template-content">
                  <div className="bk-template-meta">
                    <span className="bk-pill">{localizeNode(template.category)}</span>
                    <span>
                      <Clock3 size={14} />
                      {localizeNode(template.duration)}
                      {translateText(' min')}
                    </span>
                  </div>
                  <h2>{localizeNode(template.name)}</h2>
                  <p>{localizeNode(template.description)}</p>
                  <ul>
                    <li>
                      <Check size={14} />
                      {translateText('Weekday availability & time selection')}
                    </li>
                    <li>
                      <Check size={14} />
                      {translateText('Contact details & ')}
                      {localizeNode(template.questions.length)}
                      {translateText(' intake questions')}
                    </li>
                    <li>
                      <Check size={14} />
                      {translateText('Confirmation & rescheduling')}
                    </li>
                  </ul>
                  <footer>
                    <button
                      className="bk-button"
                      onClick={() => setPreview(createBookingTemplate(template))}
                    >
                      <Eye size={14} />
                      {translateText('Preview')}
                    </button>
                    <button className="bk-button primary" onClick={() => install(template)}>
                      {translateText('Use template')}
                      <ArrowRight size={14} />
                    </button>
                  </footer>
                </div>
              </article>
            ))
          )}
      </div>
      {localizeNode(
        preview && (
          <Modal
            wide
            title={translateText(preview.name + ' preview')}
            close={() => setPreview(null)}
          >
            <div className="bk-template-preview">
              <BookingLivePreview key={preview.id} page={preview} />
            </div>
          </Modal>
        )
      )}
    </main>
  );
}
