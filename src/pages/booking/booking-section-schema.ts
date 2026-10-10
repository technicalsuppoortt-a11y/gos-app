// Create/Edit source: public/Feedback/Calander/BookingSection.tsx.
// GOS keeps stable string IDs and numeric durations while preserving the reference's settings.
export type LocationType = 'none' | 'zoom' | 'meet' | 'teams' | 'phone' | 'in-person' | 'ask-invitee' | 'custom';
export type LocationOption = { id: string; type: LocationType; label: string; address: string; customLabel: string; linked: boolean };
export const LOCATION_TYPES: Record<LocationType, string> = { none: 'None', zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams', phone: 'Phone call', 'in-person': 'In person', 'ask-invitee': 'Invitee location', custom: 'Custom location' };
export type Interval = { id: string; start: string; end: string; date?: string };
export type DateAvailability = Interval & { date: string };
export type WeekdayAvailability = Interval & { day: string };
export type BookingLimit = { id: string; limit: number; scope: 'all' | 'email'; period: 'day' | 'week' | 'month' | 'total' };
export type Workflow = {
  enabled: boolean; name: string; type: 'email' | 'whatsapp' | 'sms';
  trigger: 'immediate' | 'after_booking' | 'before_event' | 'after_event' | 'abandoned';
  timingValue: number; timingUnit: 'minutes' | 'hours' | 'days';
  subject: string; body: string; emailFormat: 'default' | 'template'; emailTemplateId: string;
};
export type AfterBooking = {
  confirmationBody: string; allowCancelReschedule: boolean; scheduleAnother: boolean;
  prefill: boolean; redirectEnabled: boolean; redirectUrl: string; webhookEnabled: boolean; webhookUrl: string;
};
export type SectionSettings = {
  language: 'en' | 'ar'; displayBranding: boolean; image: string; imageRound: boolean; mediaType: 'image' | 'video'; titleOverride: string;
  passwordProtect: boolean; password: string; locations: LocationOption[];
  customDuration: number; free: boolean; price: number; currency: string; priceType: 'fixed' | 'hourly' | 'per_attendee';
  allowMultipleBookings: boolean; allowRecurring: boolean; displaySpotsLeft: boolean;
  specificDateAvailability: DateAvailability[]; additionalWeekdayAvailability: WeekdayAvailability[]; breaks: Interval[];
  timezoneDisplay: 'auto' | 'locked'; showTimezone: boolean; lookBusy: { enabled: boolean; min: number; max: number }; grayOutBusy: boolean; bookingLimits: BookingLimit[];
  formSettings: {
    nameType: 'name' | 'firstlast'; firstNameLabel: string; lastNameLabel: string;
    guestsLabel: string; guestsActive: boolean; guestsRequired: boolean; guestsShowCounter: boolean;
    guestDetails: { id: string; label: string; active: boolean; required: boolean }[];
  };
  notifications: { confirmationEmail: boolean; reminders: number; followUp: boolean };
  notificationWorkflows: Record<string, Workflow>;
  templateSettings: { previewMode: 'default' | 'template'; previewTemplateId: string; postBookingMode: 'standard' | 'template' | 'custom_url'; redirectUrl: string; thankYouTemplateId: string; emailNotificationMode: 'default' | 'template'; emailTemplateId: string };
};
export function sectionDefaults(): SectionSettings {
  const workflow = (name: string, trigger: Workflow['trigger'], timingValue = 0, timingUnit: Workflow['timingUnit'] = 'minutes'): Workflow => ({
    enabled: true, name, type: 'email', trigger, timingValue, timingUnit, subject: name, body: 'Hello {INVITEE_FIRST_NAME},\nYour appointment with {AFFILIATE_NAME}: {DATE} at {TIME}.\n{MANAGE_BOOKING_LINK}', emailFormat: 'default', emailTemplateId: '',
  });
  return {
    language: 'en', displayBranding: true, image: '', imageRound: false, mediaType: 'image', titleOverride: '', passwordProtect: false, password: '',
    locations: [], customDuration: 30, free: true, price: 0, currency: 'USD', priceType: 'fixed',
    allowMultipleBookings: false, allowRecurring: false, displaySpotsLeft: true,
    specificDateAvailability: [], additionalWeekdayAvailability: [], breaks: [],
    timezoneDisplay: 'auto', showTimezone: true, lookBusy: { enabled: false, min: 20, max: 40 }, grayOutBusy: false, bookingLimits: [],
    formSettings: { nameType: 'name', firstNameLabel: 'First name', lastNameLabel: 'Last name', guestsLabel: 'Guests', guestsActive: true, guestsRequired: false, guestsShowCounter: false, guestDetails: [{ id:'name',label:'Guest name',active:true,required:true },{ id:'email',label:'Guest email',active:true,required:true }] },
    notifications: { confirmationEmail: true, reminders: 1, followUp: false },
    notificationWorkflows: {
      immediateConfirmationEmail: workflow('Immediate booking confirmation', 'immediate'),
      immediateConfirmationWhatsapp: workflow('1 minute after booking follow-up', 'after_booking', 1),
      reminder24hEmail: workflow('24 hours before', 'before_event', 24, 'hours'),
      reminder3hWhatsapp: workflow('3 hours before', 'before_event', 3, 'hours'),
      reminder30mSmsWhatsapp: workflow('30 minutes before', 'before_event', 30),
      postEventAttendedEmail: workflow('After event — attended', 'after_event'),
      postEventNoShowEmail: workflow('After event — no show', 'after_event'),
      abandonment2hEmail: workflow('2 hours after visit', 'abandoned', 2, 'hours'),
      abandonment2dEmail: workflow('2 days after visit', 'abandoned', 2, 'days'),
    },
    templateSettings: { previewMode: 'default', previewTemplateId: '', postBookingMode: 'standard', redirectUrl: '', thankYouTemplateId: '', emailNotificationMode: 'default', emailTemplateId: '' },
  };
}
export const safeHttpUrl = (value: string) => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } };
export function locationFromLabel(label: string, id: string): LocationOption {
  const type = (Object.keys(LOCATION_TYPES) as LocationType[]).find(t => LOCATION_TYPES[t] === label) || 'custom';
  return { id, type, label, address: '', customLabel: type === 'custom' ? label : '', linked: false };
}
export function weekdayMatches(pattern: string, day: number) {
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return pattern === names[day] || pattern === 'Every day' || (pattern === 'Mon - Fri' && day > 0 && day < 6) || (pattern === 'Sat - Sun' && (day === 0 || day === 6));
}

