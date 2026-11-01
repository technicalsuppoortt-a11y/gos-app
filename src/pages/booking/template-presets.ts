import { blankPage, slugify } from './model';
import type { BookingPage, Question } from './model';
import { locationFromLabel } from './booking-section-schema';
export type BookingTemplatePreset = { key: string; category: string; name: string; description: string; image: string; duration: number; location: string; color: string; questions: Question[]; bookingPage?: BookingPage };
export const bookingTemplatePresets: BookingTemplatePreset[] = [
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

export function createBookingTemplate(template: BookingTemplatePreset): BookingPage {
  const base = blankPage();
  if (template.bookingPage) return { ...structuredClone(template.bookingPage), id: base.id, name: template.name, slug: `${slugify(template.name)}-${base.id.slice(0, 8)}`, crmRouting: undefined };
  return { ...base, name: template.name, slug: `${slugify(template.name)}-${base.id.slice(0, 8)}`, description: template.description,
    image: template.image, duration: template.duration, customDuration: template.duration, durationOptions: [template.duration],
    location: template.location, locationOptions: [template.location], locations: [locationFromLabel(template.location, 'template-location')],
    color: template.color, questions: [...base.questions, ...structuredClone(template.questions)],
    formSettings: { ...base.formSettings, guestsActive: template.key === 'strategy' },
    afterBooking: { ...base.afterBooking, confirmationBody: `Your ${template.name.toLowerCase()} is confirmed. We look forward to meeting you.` },
  };
}

