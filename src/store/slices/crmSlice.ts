import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Lead, LeadStage } from '../../types/business';
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
const crmSlice = createSlice({
  name: 'crm',
  initialState: { leads: [] as CanonicalLead[], pipelines: [mainPipeline] },
  reducers: {
    hydrateCRM(state, action: PayloadAction<{ leads: CanonicalLead[]; pipelines: Pipeline[] }>) { state.leads = action.payload.leads; state.pipelines = action.payload.pipelines.length ? action.payload.pipelines : [mainPipeline]; },
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

export const { hydrateCRM, savePipeline, deleteLeads, updateLead, addLead, moveLead, addLeadNote, addLeadActivity, setLeadFollowUpState, setLeadConsent } = crmSlice.actions;
export default crmSlice.reducer;
