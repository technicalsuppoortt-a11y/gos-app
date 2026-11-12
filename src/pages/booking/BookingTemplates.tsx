import { thumbnailImageProps } from '../../utils/thumbnailImages';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  Check,
} from 'lucide-react';
import { KEYS, readPages, write } from './model';
import type { BookingPage } from './model';
import { createBookingTemplate, type BookingTemplatePreset } from './template-presets';
import { useBookingTemplateCatalogState } from '../../backend/nativeTemplateCatalog';
import { BookingLivePreview } from './BookingLivePreview';
import { Modal } from './ui';
import './booking-workspace.css';

export function BookingTemplates() {
  useUILanguage();
  const navigate = useNavigate();
  const { templates, loading, error: catalogError } = useBookingTemplateCatalogState();
  const [preview, setPreview] = useState<BookingPage | null>(null);
  const [error, setError] = useState('');

  const installing = useRef(false);
  const install = async (template: BookingTemplatePreset) => {
    if (installing.current) return;
    installing.current = true;
    setError('');
    try {
      const page = createBookingTemplate(template);
      await write(KEYS.pages, [...readPages(), page]);
      navigate(`/dashboard/booking/${encodeURIComponent(page.id)}/edit`);
    } catch {
      setError('Could not save this booking preset. Try again.');
    } finally {
      installing.current = false;
    }
  };

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
          <h1>{translateText('Booking Presets')}</h1>
          <p>{translateText('Choose a preset to start a new booking page.')}</p>
        </div>
      </header>

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
        !templates.length && (
          <p role="status">{translateText('No published booking templates are available.')}</p>
        )}

      <div className="bk-template-grid">
        {localizeNode(
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
