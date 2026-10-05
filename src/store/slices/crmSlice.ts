import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { leads as demoLeads } from '../../data/mockData';
import type { Lead, LeadStage } from '../../data/mockData';
import { mainPipeline, type Pipeline } from '../../pages/crm/model';

export type LeadActivity = { id: string; type: 'capture' | 'stage' | 'message' | 'booking' | 'payment' | 'note' | 'system'; title: string; detail: string; at: string };
export type FollowUpLifecycleState = 'NEW' | 'CONTACTED' | 'CONVERSING' | 'QUALIFYING' | 'QUALIFIED' | 'BOOKING_OFFERED' | 'BOOKED' | 'PRE_MEETING_REMINDER' | 'POST_MEETING' | 'NO_SHOW' | 'CUSTOMER' | 'NURTURE_REACTIVATION' | 'HUMAN_HANDOFF' | 'STOPPED_INELIGIBLE';
export type MessagingChannel = 'whatsapp' | 'instagram' | 'facebook' | 'messenger' | 'email';
export type CanonicalLead = Lead & { lifecycleStage: LeadStage; bookingStatus: 'Not Scheduled' | 'Offer Sent' | 'Booked' | 'Completed'; activities: LeadActivity[]; notes: string[]; qualificationStatus: 'Pending' | 'Qualified' | 'Unqualified'; followUpState: FollowUpLifecycleState; hasWhatsAppConsent: boolean; hasMessagingConsent: boolean; hasEmailConsent: boolean; role?: string; phone?: string; photoUrl?: string; nextFollowUpAt?: string; pipelineId?: string; archived?: boolean; createdAt?: string; tasks?: { id: string; title: string; due: string; done: boolean }[] };
export const FOLLOW_UP_LIFECYCLE: { state: FollowUpLifecycleState; label: string; description: string }[] = [
  { state: 'NEW', label: 'New', description: 'Initial capture from a funnel form' },
  { state: 'CONTACTED', label: 'Contacted', description: 'Initial message dispatched with consent' },
  { state: 'CONVERSING', label: 'Conversing', description: 'Lead replied; active conversation' },
  { state: 'QUALIFYING', label: 'Qualifying', description: 'AI is checking requirements and fit' },
  { state: 'QUALIFIED', label: 'Qualified', description: 'Criteria met for a booking' },
  { state: 'BOOKING_OFFERED', label: 'Booking offered', description: 'Calendar slots offered' },
  { state: 'BOOKED', label: 'Booked', description: 'Meeting confirmed in calendar' },
  { state: 'PRE_MEETING_REMINDER', label: 'Pre-meeting reminder', description: 'Event-based reminder before the call' },
  { state: 'POST_MEETING', label: 'Post-meeting', description: 'Consultation follow-up' },
  { state: 'NO_SHOW', label: 'No-show', description: 'Re-engagement after a missed appointment' },
  { state: 'CUSTOMER', label: 'Customer', description: 'Converted customer sequence' },
  { state: 'NURTURE_REACTIVATION', label: 'Nurture / reactivation', description: 'Recovery campaign for inactive leads' },
  { state: 'HUMAN_HANDOFF', label: 'Human handoff', description: 'Automation paused for team attention' },
  { state: 'STOPPED_INELIGIBLE', label: 'Stopped / ineligible', description: 'Opt-out or missing consent' },
];
const stageFromLegacy: Record<string, LeadStage> = { NEW: 'LEAD_CAPTURED', CONTACTED: 'CONTACT_CREATED', QUALIFIED: 'QUALIFIED', BOOKING_OFFERED: 'BOOKING', BOOKED: 'BOOKING', CUSTOMER: 'ACTIVE_CUSTOMER', CLOSED: 'CLOSED_LOST' };
const bookingFromStage = (stage: string): CanonicalLead['bookingStatus'] => stage === 'BOOKED' ? 'Booked' : stage === 'BOOKING_OFFERED' ? 'Offer Sent' : stage === 'CUSTOMER' ? 'Completed' : 'Not Scheduled';
const followUpFromStage = (stage: string): FollowUpLifecycleState => ({ NEW: 'NEW', CONTACTED: 'CONTACTED', QUALIFIED: 'QUALIFIED', BOOKING_OFFERED: 'BOOKING_OFFERED', BOOKED: 'BOOKED', CUSTOMER: 'CUSTOMER', CLOSED: 'STOPPED_INELIGIBLE' }[stage] as FollowUpLifecycleState | undefined) ?? 'NEW';
const makeInitialLeads = (): CanonicalLead[] => demoLeads.map(lead => ({
  ...lead,
  lifecycleStage: stageFromLegacy[lead.stage] ?? 'LEAD_CAPTURED',
  bookingStatus: bookingFromStage(lead.stage),
  followUpState: followUpFromStage(lead.stage),
  hasWhatsAppConsent: lead.id === 'ld-101',
  hasMessagingConsent: lead.id === 'ld-102',
  hasEmailConsent: lead.id === 'ld-103',
  qualificationStatus: lead.tags.some(tag => tag.toLowerCase() === 'unqualified') ? 'Unqualified' : lead.stage === 'QUALIFIED' ? 'Qualified' : 'Pending',
  role: 'Contact',
  activities: [{ id: `${lead.id}-captured`, type: 'capture', title: 'Lead captured', detail: `Via ${lead.source} · ${lead.lastActivity}`, at: lead.lastActivity }, { id: `${lead.id}-page`, type: 'system', title: 'Funnel page viewed', detail: 'Landing page viewed · fitness/brand-strategy offer', at: lead.lastActivity }, ...(lead.stage === 'CONTACTED' || lead.stage === 'QUALIFIED' || lead.stage === 'BOOKING_OFFERED' || lead.stage === 'BOOKED' || lead.stage === 'CUSTOMER' ? [{ id: `${lead.id}-conversation`, type: 'message' as const, title: 'Conversation started', detail: `First touch via ${lead.source}`, at: lead.lastActivity }] : []), ...(lead.stage === 'BOOKED' || lead.stage === 'CUSTOMER' ? [{ id: `${lead.id}-booking`, type: 'booking' as const, title: 'Booking recorded', detail: lead.nextFollowUp ?? 'Booking linked to this contact', at: lead.lastActivity }] : [])],
  notes: [],
  stage: stageFromLegacy[lead.stage] ?? 'CONTACT_CREATED',
  source: /website|landing/i.test(lead.source) ? 'Website Funnel' : lead.source === 'Referral' ? 'Referral' : lead.source,
}));
const loadSaved = (): CanonicalLead[] => {
  try {
    const saved = localStorage.getItem('gos-crm-leads-v1');
    if (!saved) return makeInitialLeads();
    const parsed = JSON.parse(saved) as CanonicalLead[];
    if (!Array.isArray(parsed)) return makeInitialLeads();
    return parsed.map(lead => ({ ...lead, followUpState: lead.followUpState ?? followUpFromStage(lead.stage), hasWhatsAppConsent: lead.hasWhatsAppConsent ?? false, hasMessagingConsent: lead.hasMessagingConsent ?? false, hasEmailConsent: lead.hasEmailConsent ?? false, qualificationStatus: lead.qualificationStatus ?? 'Pending', bookingStatus: lead.bookingStatus ?? bookingFromStage(lead.stage), activities: lead.activities ?? [], notes: lead.notes ?? [] }));
  } catch { return makeInitialLeads(); }
};

const loadPipelines = (): Pipeline[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('gos-crm-pipelines-v1') ?? 'null') as Pipeline[] | null;
    if (Array.isArray(saved) && saved.some(p => p.id === 'main') && saved.every(p => typeof p.name === 'string' && p.stages?.length && p.stages.every(s => typeof s.id === 'string' && typeof s.label === 'string'))) {
      return saved.map(p => {
        // Upgrade the original default palette while preserving customized stages.
        const originalDefault = p.id === 'main' && p.stages.length === mainPipeline.stages.length && p.stages.every((s, i) => s.id === mainPipeline.stages[i].id && s.label === mainPipeline.stages[i].label && s.color === ['#7C5CFC', '#38bdf8', '#10b981', '#f59e0b', '#22c55e'][i]);
        return originalDefault ? { ...p, stages: mainPipeline.stages } : p;
      });
    }
  } catch { /* Fall back to the default pipeline. */ }
  return [mainPipeline];
};
const crmSlice = createSlice({
  name: 'crm',
  initialState: { leads: loadSaved(), pipelines: loadPipelines() },
  reducers: {
    savePipeline(state, action: PayloadAction<Pipeline>) {
      const index = state.pipelines.findIndex(p => p.id === action.payload.id);
      if (index < 0) state.pipelines.push(action.payload); else state.pipelines[index] = action.payload;
    },
    deleteLeads(state, action: PayloadAction<string[]>) { state.leads = state.leads.filter(lead => !action.payload.includes(lead.id)); },
    updateLead(state, action: PayloadAction<{ id: string; changes: Partial<CanonicalLead> }>) {
      const lead = state.leads.find(item => item.id === action.payload.id);
      if (lead) Object.assign(lead, action.payload.changes);
    },
    addLead(state, action: PayloadAction<CanonicalLead>) { state.leads.unshift(action.payload); },
    moveLead(state, action: PayloadAction<{ id: string; stage: LeadStage }>) {
      const lead = state.leads.find(item => item.id === action.payload.id);
      if (!lead) return;
      const previous = lead.lifecycleStage;
      lead.lifecycleStage = action.payload.stage;
      lead.stage = action.payload.stage;
      if (action.payload.stage === 'BOOKING') lead.bookingStatus = 'Offer Sent';
      if (action.payload.stage === 'PAYMENT_COMPLETED' || action.payload.stage === 'ACTIVE_CUSTOMER') lead.bookingStatus = 'Completed';
      lead.lastActivity = 'Just now';
      lead.activities.unshift({ id: `${Date.now()}`, type: 'stage', title: 'Lifecycle stage updated', detail: `${previous.replaceAll('_', ' ')} → ${action.payload.stage.replaceAll('_', ' ')}`, at: 'Just now' });
    },
    addLeadNote(state, action: PayloadAction<{ id: string; note: string }>) {
      const lead = state.leads.find(item => item.id === action.payload.id);
      if (!lead) return;
      lead.notes.unshift(action.payload.note);
      lead.activities.unshift({ id: `${Date.now()}`, type: 'note', title: 'Internal note added', detail: action.payload.note, at: 'Just now' });
    },
    addLeadActivity(state, action: PayloadAction<{ leadId: string; activity: Omit<LeadActivity, 'id' | 'at'> }>) {
      const lead = state.leads.find(item => item.id === action.payload.leadId);
      if (!lead) return;
      lead.activities.unshift({ ...action.payload.activity, id: `${Date.now()}`, at: 'Just now' });
      lead.lastActivity = 'Just now';
    },
    setLeadFollowUpState(state, action: PayloadAction<{ id: string; followUpState: FollowUpLifecycleState; detail?: string }>) {
      const lead = state.leads.find(item => item.id === action.payload.id);
      if (!lead) return;
      lead.followUpState = action.payload.followUpState;
      lead.activities.unshift({ id: `${Date.now()}`, type: 'system', title: `Follow-up state: ${action.payload.followUpState.replaceAll('_', ' ')}`, detail: action.payload.detail ?? 'Lifecycle state updated in AI Follow-Up', at: 'Just now' });
      lead.lastActivity = 'Just now';
    },
    setLeadConsent(state, action: PayloadAction<{ id: string; consent: Partial<Pick<CanonicalLead, 'hasWhatsAppConsent' | 'hasMessagingConsent' | 'hasEmailConsent'>> }>) {
      const lead = state.leads.find(item => item.id === action.payload.id);
      if (!lead) return;
      Object.assign(lead, action.payload.consent);
      lead.activities.unshift({ id: `${Date.now()}`, type: 'system', title: 'Messaging consent updated', detail: 'Consent preferences were edited by a team member', at: 'Just now' });
    },
  },
});

export const { savePipeline, deleteLeads, updateLead, addLead, moveLead, addLeadNote, addLeadActivity, setLeadFollowUpState, setLeadConsent } = crmSlice.actions;
export default crmSlice.reducer;
