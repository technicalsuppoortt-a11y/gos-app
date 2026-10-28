import { thumbnailImageProps } from '../../utils/thumbnailImages';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Eye, Check } from 'lucide-react';
import { blankPage, KEYS, readPages, slugify, write } from './model';
import type { BookingPage, Question } from './model';
import { locationFromLabel } from './booking-section-schema';
import { BookingLivePreview } from './BookingLivePreview';
import { Modal } from './ui';
import './booking-workspace.css';

type Template = { key: string; category: string; name: string; description: string; image: string; duration: number; location: string; color: string; questions: Question[] };
const templates: Template[] = [
  { key: 'strategy', category: 'Consulting', name: 'Strategy Session', description: 'Turn your next big idea into a clear plan. We’ll review your business goals, identify your biggest opportunities, and map out practical next steps in a focused one-to-one session.', image: '/dashboard/product-consultation.png', duration: 45, location: 'Google Meet', color: 'violet', questions: [
    { id: 'company', label: 'Company or website', type: 'text', required: false, options: [] },
    { id: 'goals', label: 'What would you like to achieve?', type: 'textarea', required: true, options: [] },
  ] },
  { key: 'clinic', category: 'Healthcare', name: 'Clinic Appointment', description: 'Book a visit with our care team for a dental check-up, a follow-up, or a new patient consultation. Choose a convenient time and tell us the reason for your visit so we can prepare.', image: '/pagefly/dental-clinic.png', duration: 30, location: 'In person', color: 'mint', questions: [
    { id: 'visit', label: 'Appointment type', type: 'select', required: true, options: ['New patient consultation', 'Dental check-up', 'Follow-up visit'] },
    { id: 'notes', label: 'Anything you would like us to know?', type: 'textarea', required: false, options: [] },
  ] },
  { key: 'training', category: 'Fitness', name: 'Personal Training Intro', description: 'Start your fitness journey with a friendly introductory session. Meet your coach, discuss your goals and experience, and build a training plan that fits your schedule.', image: '/dashboard/product-workout.png', duration: 60, location: 'In person', color: 'amber', questions: [
    { id: 'experience', label: 'Training experience', type: 'select', required: true, options: ['Getting started', 'Occasional training', 'Training regularly'] },
    { id: 'goals', label: 'Your fitness goals', type: 'textarea', required: true, options: [] },
  ] },
];

function createBookingTemplate(template: Template): BookingPage {
  const base = blankPage();
  return { ...base, name: template.name, slug: `${slugify(template.name)}-${base.id.slice(0, 8)}`, description: template.description,
    image: template.image, duration: template.duration, customDuration: template.duration, durationOptions: [template.duration],
    location: template.location, locationOptions: [template.location], locations: [locationFromLabel(template.location, 'template-location')],
    color: template.color, questions: [...base.questions, ...structuredClone(template.questions)],
    formSettings: { ...base.formSettings, guestsActive: template.key === 'strategy' },
    afterBooking: { ...base.afterBooking, confirmationBody: `Your ${template.name.toLowerCase()} is confirmed. We look forward to meeting you.` },
  };
}

export function BookingTemplates() {
  useUILanguage();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<BookingPage | null>(null);
  const [error, setError] = useState('');
  const install = (template: Template) => {
    try {
      const page = createBookingTemplate(template);
      write(KEYS.pages, [...readPages(), page]);
      navigate(`/dashboard/booking/${encodeURIComponent(page.id)}/edit`);
    } catch { setError('Could not save this template. Browser storage may be full or unavailable.'); }
  };
  return <main className="bk-workspace bk-template-workspace">
    <Link className="bk-button bk-template-back" to="/dashboard/booking"><ArrowLeft size={15}/>{translateText("Back to booking pages")}</Link>
    <header className="bk-page-heading"><div className="bk-heading-icon"><CalendarDays size={22}/></div><div><h1>{translateText("Booking templates")}</h1><p>{translateText("Start with a complete booking page, then personalize it for your business.")}</p></div></header>
    {localizeNode(error && <p role="alert" className="bk-error">{localizeNode(error)}</p>)}
    <div className="bk-template-grid">{localizeNode(templates.map(template => <article className="bk-card bk-template-card" key={template.key}>
      <img decoding="async" {...thumbnailImageProps(template.image)} src={template.image} alt={translateText(`${template.category} booking page`)} loading="lazy"/>
      <div className="bk-template-content"><div className="bk-template-meta"><span className="bk-pill">{localizeNode(template.category)}</span><span><Clock3 size={14}/>{localizeNode(template.duration)}{translateText(" min")}</span></div>
        <h2>{localizeNode(template.name)}</h2><p>{localizeNode(template.description)}</p><ul><li><Check size={14}/>{translateText("Weekday availability & time selection")}</li><li><Check size={14}/>{translateText("Contact details & ")}{localizeNode(template.questions.length)}{translateText(" intake questions")}</li><li><Check size={14}/>{translateText("Confirmation & rescheduling")}</li></ul>
        <footer><button className="bk-button" onClick={() => setPreview(createBookingTemplate(template))}><Eye size={14}/>{translateText("Preview")}</button><button className="bk-button primary" onClick={() => install(template)}>{translateText("Use template")}<ArrowRight size={14}/></button></footer>
      </div>
    </article>))}</div>
    {localizeNode(preview && <Modal wide title={translateText(preview.name + ' preview')} close={() => setPreview(null)}><div className="bk-template-preview"><BookingLivePreview key={preview.id} page={preview}/></div></Modal>)}
  </main>;
}
