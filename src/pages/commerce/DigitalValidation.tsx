import React from 'react';
import type { WorkspaceTab } from './views';

export const DigitalValidationContext = React.createContext<string[]>([]);
export function digitalIssue(message: string, kind = 'digital'): { field: string; tab: WorkspaceTab } {
  const lesson = message.match(/^Lesson (\d+)\.(\d+):/);
  if (lesson) return { field: `lesson-${lesson[1]}-${lesson[2]}-${/lesson title/i.test(message) ? 'title' : 'resource'}`, tab: 'information' };
  if (/modules|curriculum|community URL or/i.test(message)) return { field: 'curriculum', tab: 'information' };
  if (/Lesson resource URL/i.test(message)) return { field: 'curriculum', tab: 'information' };
  if (/asset|attachment|digital file|upload/i.test(message)) return { field: kind === 'course' ? 'curriculum' : 'assets', tab: 'information' };
  if (/product name|course title/i.test(message)) return { field: 'name', tab: 'information' };
  if (/description/i.test(message)) return { field: 'description', tab: 'information' };
  if (/download limit/i.test(message)) return { field: 'downloadLimit', tab: 'information' };
  if (/access duration/i.test(message)) return { field: 'accessDays', tab: 'information' };
  if (/^Tax rate/i.test(message)) return { field: 'taxRate', tab: 'pricing' };
  if (/^Trial days/i.test(message)) return { field: 'trialDays', tab: 'pricing' };
  if (/^Compare price/i.test(message)) return { field: 'comparePrice', tab: 'information' };
  if (/^Price|^One-time price/i.test(message)) return { field: 'price', tab: (kind === 'course' || kind === 'service') ? 'pricing' : 'information' };
  if (/booking|calendar/i.test(message)) return { field: 'bookingUrl', tab: 'booking' };
  if (/fulfillment/i.test(message)) return { field: 'fulfillment', tab: 'booking' };
  if (/service duration/i.test(message)) return { field: 'duration', tab: 'information' };
  if (/location/i.test(message)) return { field: 'location', tab: 'information' };
  if (/price|installment|payment plan|recurring|discount|tax|trial|coupon/i.test(message)) return { field: 'price', tab: 'pricing' };
  if (/checkout|terms|privacy|order bump|upsell/i.test(message)) return { field: 'checkout', tab: 'checkout' };
  if (/access|drip/i.test(message)) return { field: 'access', tab: 'access' };
  return { field: 'settings', tab: 'settings' };
}
export function digitalLabelField(label: string) {
  if (/^(Product Name|Course Title|Course Name|Product Title|Service Name|Title)/i.test(label)) return 'name';
  if (/^(Price|Base Price|Amount|One-time price|Installment amount|Recurring price)/i.test(label)) return 'price';
  if (/^Download limit/i.test(label)) return 'downloadLimit';
  if (/^Custom access duration/i.test(label)) return 'accessDays';
  if (/^Tax rate/i.test(label)) return 'taxRate';
  if (/^Trial/i.test(label)) return 'trialDays';
  if (/^Compare Price/i.test(label)) return 'comparePrice';
  if (/^(Full Description|Description)/i.test(label)) return 'description';
  if (/^(Digital Files|Assets|Attach PDF)/i.test(label)) return 'assets';
  if (/^(Course Content|Curriculum)/i.test(label)) return 'curriculum';
  if (/^(Booking|Calendar)/i.test(label)) return 'bookingUrl';
  if (/^Fulfillment/i.test(label)) return 'fulfillment';
  if (/^(Service Location|Location)/i.test(label)) return 'location';
  if (/^(Duration|Service Duration)/i.test(label)) return 'duration';
  return '';
}
export function useDigitalFieldError(field: string) {
  return React.useContext(DigitalValidationContext).filter(message => digitalIssue(message).field === field).join(' ');
}
