import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { leads as demoLeads } from '../../data/mockData';
import type { Lead, LeadStage } from '../../data/mockData';

export type LeadActivity = { id: string; type: 'capture' | 'stage' | 'message' | 'booking' | 'payment' | 'note' | 'system'; title: string; detail: string; at: string };
export type CanonicalLead = Lead & { lifecycleStage: LeadStage; bookingStatus: 'Not Scheduled' | 'Offer Sent' | 'Booked' | 'Completed'; activities: LeadActivity[]; notes: string[]; qualificationStatus: 'Pending' | 'Qualified' | 'Unqualified'; role?: string; phone?: string; nextFollowUpAt?: string };
const stageFromLegacy: Record<string, LeadStage> = { NEW: 'CONTACT_CREATED', CONTACTED: 'CONVERSATION', QUALIFIED: 'QUALIFIED', BOOKING_OFFERED: 'BOOKING', BOOKED: 'BOOKING', CUSTOMER: 'ACTIVE_CUSTOMER', CLOSED: 'CLOSED_LOST' };
const bookingFromStage = (stage: string): CanonicalLead['bookingStatus'] => stage === 'BOOKED' ? 'Booked' : stage === 'BOOKING_OFFERED' ? 'Offer Sent' : stage === 'CUSTOMER' ? 'Completed' : 'Not Scheduled';
const makeInitialLeads = (): CanonicalLead[] => demoLeads.map(lead => ({
  ...lead,
  lifecycleStage: stageFromLegacy[lead.stage] ?? 'LEAD_CAPTURED',
  bookingStatus: bookingFromStage(lead.stage),
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
    if (!Array.isArray(parsed) || !parsed.length) return makeInitialLeads();
    return parsed;
  } catch { return makeInitialLeads(); }
};

const crmSlice = createSlice({
  name: 'crm',
  initialState: { leads: loadSaved() },
  reducers: {
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
  },
});

export const { updateLead, addLead, moveLead, addLeadNote, addLeadActivity } = crmSlice.actions;
export default crmSlice.reducer;
