import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../backend/firebase';
import { encodeFirestoreValue } from '../../backend/firestoreCodec';
import { cloudStorage } from '../../backend/workspace';
import { store } from '../../store';
import { addLead, updateLead, type CanonicalLead } from '../../store/slices/crmSlice';
import type { LeadStage } from '../../types/business';
import type { ScreeningQuestion } from '../../../functions/booking-qualification.js';
import type { Appointment, BookingPage } from './model';

export const PENDING_BOOKING_LEADS_KEY = 'gos.booking.pending-leads.v1';

export function readPendingScreeningLeads(): CanonicalLead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_BOOKING_LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CanonicalLead[]) : [];
  } catch {
    return [];
  }
}

export function buildPendingScreeningLead({
  page,
  booking,
  answers,
  screeningQuestions = [],
}: {
  page: BookingPage;
  booking: Appointment;
  answers: Record<string, string>;
  screeningQuestions?: ScreeningQuestion[];
}): CanonicalLead {
  const now = new Date().toISOString();
  const email = String(booking.email || answers.email || '')
    .trim()
    .toLowerCase();
  const fullName = String(
    booking.name ||
      [answers.firstName, answers.lastName].filter(Boolean).join(' ') ||
      (email ? email.split('@')[0] : '') ||
      'Invitee'
  ).trim();
  const phone = String(booking.whatsapp || answers.whatsapp || answers.phone || '').trim();
  const identityKey = (email || phone.replace(/\D/g, '') || fullName || booking.id)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28);
  const leadId = `lead-screening-${identityKey || booking.id.slice(0, 12)}`;

  const labelById = new Map<string, string>();
  for (const q of page.questions || []) {
    if (q?.id && q?.label) labelById.set(q.id, q.label);
  }
  for (const sq of screeningQuestions || []) {
    if (sq?.id && sq?.label) labelById.set(sq.id, sq.label);
  }

  const answerLines: string[] = [];
  for (const [key, val] of Object.entries(answers || {})) {
    if (['name', 'firstName', 'lastName', 'email', 'whatsapp', 'phone'].includes(key)) continue;
    const text = String(val ?? '').trim();
    if (!text) continue;
    const label = labelById.get(key) || key;
    answerLines.push(`${label}: ${text}`);
  }

  const stage = (page.crmRouting?.stageId || 'LEAD_CAPTURED') as LeadStage;
  const pipelineId = page.crmRouting?.pipelineId || 'main';
  const avatar =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'L';

  const noteSummary = answerLines.length
    ? `Screening responses (${page.name} · ${booking.date} ${booking.time}): ${answerLines.join(' | ')}`
    : `Submitted booking screening on ${page.name} (${booking.date} ${booking.time}).`;

  return {
    id: leadId,
    name: fullName,
    email,
    phone,
    company: String(answers.company || ''),
    source: 'Booking',
    owner: 'Unassigned',
    value: Number(booking.payment?.amount ?? (!page.free ? page.price : 0)) || 0,
    currency: booking.payment?.currency || page.currency || 'USD',
    pipelineId,
    stage,
    lifecycleStage: stage,
    bookingStatus: 'Pending Booking',
    qualificationStatus: 'Unqualified',
    followUpState: 'NEW',
    interest: `${page.name} (${booking.date} ${booking.time})`,
    avatar,
    color: 'amber',
    hasWhatsAppConsent: Boolean(phone),
    hasMessagingConsent: true,
    hasEmailConsent: Boolean(email),
    tags: [...new Set(['Booking', 'Pending Booking', page.name].filter(Boolean))],
    notes: [noteSummary],
    activities: [
      {
        id: `act-screening-${booking.id}`,
        type: 'booking',
        title: 'Pending booking (screening)',
        detail: `${page.name} · ${booking.date} ${booking.time}${answerLines.length ? ' · ' + answerLines.join(' · ') : ''}`,
        at: now,
      },
    ],
    lastActivity: now,
    createdAt: now,
  };
}

export async function recordPendingScreeningLead(params: {
  page: BookingPage;
  booking: Appointment;
  answers: Record<string, string>;
  screeningQuestions?: ScreeningQuestion[];
}): Promise<CanonicalLead> {
  const lead = buildPendingScreeningLead(params);

  // 1. Persist in browser localStorage so cross-tab or public-to-dashboard navigation picks it up immediately.
  if (typeof window !== 'undefined') {
    try {
      const existing = readPendingScreeningLeads().filter(
        item =>
          item.id !== lead.id &&
          (!lead.email || String(item.email || '').trim().toLowerCase() !== lead.email)
      );
      const next = [lead, ...existing].slice(0, 100);
      window.localStorage.setItem(PENDING_BOOKING_LEADS_KEY, JSON.stringify(next));
      window.dispatchEvent(new StorageEvent('storage', { key: PENDING_BOOKING_LEADS_KEY }));
      window.dispatchEvent(new CustomEvent('gos-booking-change', { detail: PENDING_BOOKING_LEADS_KEY }));
    } catch {
      // Ignore storage quota errors
    }
  }

  // 2. Dispatch into Redux CRM state immediately so /dashboard/crm renders it without delay.
  try {
    const state = store.getState();
    const existingRedux = state.crm.leads.find(
      item =>
        item.id === lead.id ||
        (lead.email && String(item.email || '').trim().toLowerCase() === lead.email)
    );
    const scope = state.auth.tenant?.id;
    if (existingRedux) {
      const mergedTags = [...new Set([...(existingRedux.tags || []), ...lead.tags])];
      const mergedNotes = [...new Set([...lead.notes, ...(existingRedux.notes || [])])];
      const mergedActivities = [
        ...lead.activities,
        ...(existingRedux.activities || []).filter(a => a.id !== lead.activities[0]?.id),
      ];
      store.dispatch(
        updateLead({
          id: existingRedux.id,
          changes: {
            ...lead,
            id: existingRedux.id,
            tags: mergedTags,
            notes: mergedNotes,
            activities: mergedActivities,
            bookingStatus: 'Pending Booking',
            qualificationStatus: 'Unqualified',
          },
        })
      );
      if (scope) {
        store.dispatch({
          type: 'crm/setLeadBackend',
          payload: { scope, id: existingRedux.id, backend: 'firestore' },
        });
      }
    } else {
      store.dispatch(addLead(lead));
      if (scope) {
        store.dispatch({
          type: 'crm/setLeadBackend',
          payload: { scope, id: lead.id, backend: 'firestore' },
        });
      }
    }
  } catch {
    // Ignore store dispatch errors in isolated test harnesses
  }

  // 3. Persist directly to Firestore tenants/{tenantId}/leads/{leadId} when workspace scope is active.
  try {
    const scope = store.getState().auth.tenant?.id;
    if (scope) {
      await setDoc(doc(db, 'tenants', scope, 'leads', lead.id), encodeFirestoreValue(lead), {
        merge: true,
      });
    }
    const rawCloud = cloudStorage.getItem('gos-crm-leads-v1');
    if (rawCloud !== null) {
      const parsed = JSON.parse(rawCloud);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (item: any) =>
            item?.id !== lead.id &&
            (!lead.email || String(item?.email || '').trim().toLowerCase() !== lead.email)
        );
        void cloudStorage
          .setItem('gos-crm-leads-v1', JSON.stringify([lead, ...filtered]), { silent: true })
          .catch(() => {});
      }
    }
  } catch {
    // Firestore sync will also be reconciled by WorkspaceData when /dashboard/crm opens
  }

  return lead;
}
