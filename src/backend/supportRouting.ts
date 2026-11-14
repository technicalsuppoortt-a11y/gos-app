import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { db } from './firebase';
import { useEntities } from './workspace';
import { store, type RootState } from '../store';
import {
  setLeadFollowUpState,
  updateLead,
  type CanonicalLead,
} from '../store/slices/crmSlice';
import {
  ALL_SHIFT_DAYS,
  defaultSupportShiftSchedule,
  defaultWorkspaceTimezone,
  isSupportMemberRole,
  normalizeMemberRecord,
  readTeam,
  type DayCode,
  type Member,
} from '../pages/settings/localState';
import { pushWorkspaceNotification } from './notifications';

export type AssignmentReason = 'shift_weighted' | 'owner_fallback' | 'manual' | 'handoff';

export interface UnifiedAssignmentRecord {
  id: string;
  unifiedKey: string;
  tenantId: string;
  leadId?: string;
  conversationIds: string[];
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  channel?: string;
  assignedTo: string;
  assignedAgentName: string;
  assignedAgentEmail?: string;
  assignedAgentRole?: string;
  assignmentReason: AssignmentReason;
  takenOver: boolean;
  aiAutoReply: boolean;
  status: 'open' | 'resolved';
  stage?: string;
  tags?: string[];
  handoffTimestamp?: string;
  assignedAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ShiftEvaluation {
  onShift: boolean;
  currentDay: DayCode;
  currentTime: string;
  timezone: string;
  scheduleLabel: string;
}

function normalizePhoneDigits(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : '';
}

function normalizeEmail(email?: string): string {
  const clean = String(email || '').trim().toLowerCase();
  return clean.includes('@') ? clean : '';
}

function parseMinutes(hhmm: string, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
  return Math.max(0, Math.min(1439, h * 60 + m));
}

export function evaluateAgentShift(
  member: Pick<Member, 'active' | 'shiftSchedule' | 'isOwner' | 'role'>,
  now: Date = new Date(),
  fallbackTimezone?: string,
): ShiftEvaluation {
  const tz =
    member.shiftSchedule?.timezone?.trim() ||
    fallbackTimezone ||
    defaultWorkspaceTimezone();

  let currentDay: DayCode = 'Mon';
  let currentTime = '12:00';
  let resolvedTz = tz;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const wk = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const hr = parts.find(p => p.type === 'hour')?.value || '12';
    const mn = parts.find(p => p.type === 'minute')?.value || '00';
    if ((ALL_SHIFT_DAYS as string[]).includes(wk)) {
      currentDay = wk as DayCode;
    }
    currentTime = `${hr.padStart(2, '0') === '24' ? '00' : hr.padStart(2, '0')}:${mn.padStart(2, '0')}`;
  } catch {
    resolvedTz = 'UTC';
    const utcDay = ALL_SHIFT_DAYS[now.getUTCDay()] || 'Mon';
    currentDay = utcDay;
    currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  }

  if (member.isOwner || String(member.role || '').toLowerCase() === 'owner') {
    return {
      onShift: true,
      currentDay,
      currentTime,
      timezone: resolvedTz,
      scheduleLabel: '24/7 (Owner Fallback)',
    };
  }

  const schedule = member.shiftSchedule || defaultSupportShiftSchedule(resolvedTz);
  const scheduleLabel = `${schedule.days.join(', ')} · ${schedule.startTime}–${schedule.endTime}`;

  if (member.active === false) {
    return {
      onShift: false,
      currentDay,
      currentTime,
      timezone: resolvedTz,
      scheduleLabel,
    };
  }

  if (schedule.enabled === false) {
    return {
      onShift: true,
      currentDay,
      currentTime,
      timezone: resolvedTz,
      scheduleLabel: '24/7 (Always Available)',
    };
  }

  if (!schedule.days.length) {
    return {
      onShift: false,
      currentDay,
      currentTime,
      timezone: resolvedTz,
      scheduleLabel,
    };
  }

  const startMins = parseMinutes(schedule.startTime, 9 * 60);
  const endMins = parseMinutes(schedule.endTime, 17 * 60);
  const nowMins = parseMinutes(currentTime, 12 * 60);

  let onShift = false;
  if (startMins <= endMins) {
    onShift = schedule.days.includes(currentDay) && nowMins >= startMins && nowMins <= endMins;
  } else {
    // Overnight shift (e.g. 22:00 -> 06:00)
    const dayIdx = ALL_SHIFT_DAYS.indexOf(currentDay);
    const prevDay = ALL_SHIFT_DAYS[(dayIdx + 6) % 7];
    onShift =
      (schedule.days.includes(currentDay) && nowMins >= startMins) ||
      (schedule.days.includes(prevDay) && nowMins <= endMins);
  }

  return {
    onShift,
    currentDay,
    currentTime,
    timezone: resolvedTz,
    scheduleLabel,
  };
}

export interface SelectedSupportRoute {
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentRole: string;
  reason: 'shift_weighted' | 'owner_fallback';
  allocationPercent: number;
}

export function selectSupportAssignee(params: {
  members: Member[];
  existingAssignments: UnifiedAssignmentRecord[];
  ownerFallback: { id: string; name: string; email: string };
  now?: Date;
  fallbackTimezone?: string;
}): SelectedSupportRoute {
  const { members, existingAssignments, ownerFallback, now = new Date(), fallbackTimezone } = params;

  const activeOnShiftAgents = members.filter(member => {
    if (member.isOwner || String(member.role || '').toLowerCase() === 'owner') return false;
    if (!isSupportMemberRole(member)) return false;
    if (member.active === false) return false;
    const alloc = member.leadAllocationPercent ?? 50;
    if (alloc <= 0) return false;
    return evaluateAgentShift(member, now, fallbackTimezone).onShift;
  });

  if (activeOnShiftAgents.length === 0) {
    return {
      agentId: ownerFallback.id,
      agentName: ownerFallback.name || 'Workspace Owner',
      agentEmail: ownerFallback.email || '',
      agentRole: 'Owner',
      reason: 'owner_fallback',
      allocationPercent: 100,
    };
  }

  const weights = activeOnShiftAgents.map(a => Math.max(1, a.leadAllocationPercent ?? 50));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;

  const countsByAgent = new Map<string, number>();
  for (const agent of activeOnShiftAgents) {
    const uid = agent.authUid || agent.id;
    const emailLower = normalizeEmail(agent.email);
    const nameLower = agent.name.trim().toLowerCase();
    let count = 0;
    for (const rec of existingAssignments) {
      if (rec.status === 'resolved') continue;
      if (
        rec.assignedTo === uid ||
        rec.assignedTo === agent.id ||
        (emailLower && normalizeEmail(rec.assignedAgentEmail) === emailLower) ||
        (nameLower && rec.assignedAgentName.trim().toLowerCase() === nameLower)
      ) {
        count += 1;
      }
    }
    countsByAgent.set(agent.id, count);
  }

  const totalPoolAssigned = [...countsByAgent.values()].reduce((sum, c) => sum + c, 0);

  const ranked = activeOnShiftAgents
    .map((agent, index) => {
      const weight = weights[index];
      const targetShare = weight / totalWeight;
      const currentCount = countsByAgent.get(agent.id) || 0;
      // Weighted deficit score: prioritizes highest allocation % first when pool is empty,
      // and maintains exact proportional allocation ratios as leads arrive.
      const deficitScore = targetShare * (totalPoolAssigned + 1) - currentCount;
      return { agent, weight, deficitScore };
    })
    .sort((a, b) => {
      if (Math.abs(b.deficitScore - a.deficitScore) > 1e-6) {
        return b.deficitScore - a.deficitScore;
      }
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return a.agent.id.localeCompare(b.agent.id);
    });

  const chosen = ranked[0].agent;
  return {
    agentId: chosen.authUid || chosen.id,
    agentName: chosen.name,
    agentEmail: chosen.email,
    agentRole: chosen.role || 'Support',
    reason: 'shift_weighted',
    allocationPercent: chosen.leadAllocationPercent ?? 50,
  };
}

export function matchLeadForIdentity(
  leads: CanonicalLead[],
  identity: { leadId?: string; email?: string; phone?: string; name?: string },
): CanonicalLead | undefined {
  if (identity.leadId) {
    const byId = leads.find(l => l.id === identity.leadId);
    if (byId) return byId;
  }
  const cleanEmail = normalizeEmail(identity.email);
  if (cleanEmail) {
    const byEmail = leads.find(l => normalizeEmail(l.email) === cleanEmail);
    if (byEmail) return byEmail;
  }
  const phoneKey = normalizePhoneDigits(identity.phone);
  if (phoneKey) {
    const byPhone = leads.find(l => normalizePhoneDigits(l.phone) === phoneKey);
    if (byPhone) return byPhone;
  }
  return undefined;
}

export function computeUnifiedKey(
  identity: { leadId?: string; conversationId?: string; email?: string; phone?: string },
  leads: CanonicalLead[] = [],
): string {
  const matchedLead = matchLeadForIdentity(leads, identity);
  const resolvedLeadId = matchedLead?.id || identity.leadId;
  if (resolvedLeadId) {
    return `lead_${String(resolvedLeadId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110)}`;
  }
  const cleanEmail = normalizeEmail(identity.email);
  if (cleanEmail) {
    return `email_${cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 100)}`;
  }
  const phoneKey = normalizePhoneDigits(identity.phone);
  if (phoneKey) {
    return `phone_${phoneKey}`;
  }
  return `conv_${String(identity.conversationId || 'record').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110)}`;
}

export function findUnifiedAssignment(
  records: UnifiedAssignmentRecord[],
  target: { leadId?: string; conversationId?: string; email?: string; phone?: string },
): UnifiedAssignmentRecord | undefined {
  if (!records.length) return undefined;
  if (target.leadId) {
    const byLead = records.find(r => r.leadId === target.leadId || r.unifiedKey === `lead_${target.leadId}`);
    if (byLead) return byLead;
  }
  if (target.conversationId) {
    const byConv = records.find(
      r =>
        r.conversationIds?.includes(target.conversationId!) ||
        r.unifiedKey === `conv_${target.conversationId}`,
    );
    if (byConv) return byConv;
  }
  const cleanEmail = normalizeEmail(target.email);
  if (cleanEmail) {
    const byEmail = records.find(r => normalizeEmail(r.customerEmail) === cleanEmail);
    if (byEmail) return byEmail;
  }
  const phoneKey = normalizePhoneDigits(target.phone);
  if (phoneKey) {
    const byPhone = records.find(r => normalizePhoneDigits(r.customerPhone) === phoneKey);
    if (byPhone) return byPhone;
  }
  return undefined;
}

async function syncCanonicalLeadAndConversationDocs(params: {
  scope: string;
  leadId?: string;
  conversationId?: string;
  assignedTo: string;
  assignedAgentName: string;
  takenOver?: boolean;
  handoffTimestamp?: string;
  stage?: string;
}) {
  const {
    scope,
    leadId,
    conversationId,
    assignedTo,
    assignedAgentName,
    takenOver,
    handoffTimestamp,
    stage,
  } = params;
  const nowIso = new Date().toISOString();

  if (leadId) {
    const leadPatch: Partial<CanonicalLead> = {
      owner: assignedAgentName,
      assignedTo,
      assignedAgentName,
      ...(handoffTimestamp ? { handoffTimestamp } : {}),
      ...(takenOver ? { followUpState: 'HUMAN_HANDOFF' } : {}),
      ...(stage ? { stage: stage as CanonicalLead['stage'], lifecycleStage: stage as CanonicalLead['lifecycleStage'] } : {}),
      lastActivity: 'Just now',
    };
    store.dispatch(updateLead({ id: leadId, changes: leadPatch }));
    if (takenOver) {
      store.dispatch(
        setLeadFollowUpState({
          id: leadId,
          followUpState: 'HUMAN_HANDOFF',
          detail: `Conversation handed off to ${assignedAgentName}`,
        }),
      );
    }
    await setDoc(
      doc(db, 'tenants', scope, 'leads', leadId),
      {
        owner: assignedAgentName,
        assignedTo,
        assignedAgentName,
        ...(handoffTimestamp ? { handoffTimestamp } : {}),
        ...(takenOver ? { followUpState: 'HUMAN_HANDOFF' } : {}),
        ...(stage ? { stage, lifecycleStage: stage } : {}),
        lastActivity: nowIso,
      },
      { merge: true },
    ).catch(() => null);
  }

  if (conversationId && !conversationId.startsWith('crm-')) {
    await setDoc(
      doc(db, 'tenants', scope, 'conversations', conversationId),
      {
        assignedTo,
        assigneeId: assignedTo,
        assignedAgentName,
        assignee: assignedAgentName,
        ...(typeof takenOver === 'boolean' ? { takenOver, aiAutoReply: !takenOver } : {}),
        ...(handoffTimestamp ? { handoffTimestamp } : {}),
        updatedAt: nowIso,
      },
      { merge: true },
    ).catch(() => null);
  }
}

export async function routeUnifiedLeadOrConversation(params: {
  scope: string;
  trigger: 'new_lead' | 'new_conversation' | 'handoff';
  leadId?: string;
  conversationId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  channel?: string;
  members: Member[];
  existingAssignments: UnifiedAssignmentRecord[];
  ownerFallback: { id: string; name: string; email: string };
  actorUid?: string;
  forceReassign?: boolean;
}): Promise<UnifiedAssignmentRecord> {
  const {
    scope,
    trigger,
    customerName,
    customerEmail,
    customerPhone,
    channel,
    members,
    existingAssignments,
    ownerFallback,
    actorUid,
    forceReassign = false,
  } = params;

  const leads = store.getState().crm.leads;
  const matchedLead = matchLeadForIdentity(leads, {
    leadId: params.leadId,
    email: customerEmail,
    phone: customerPhone,
  });
  const resolvedLeadId = matchedLead?.id || params.leadId;

  const existing = findUnifiedAssignment(existingAssignments, {
    leadId: resolvedLeadId,
    conversationId: params.conversationId,
    email: customerEmail || matchedLead?.email,
    phone: customerPhone || matchedLead?.phone,
  });

  const unifiedKey =
    existing?.unifiedKey ||
    computeUnifiedKey(
      {
        leadId: resolvedLeadId,
        conversationId: params.conversationId,
        email: customerEmail || matchedLead?.email,
        phone: customerPhone || matchedLead?.phone,
      },
      leads,
    );

  const assignmentRef = doc(db, 'settings', `supportRouting_${scope}`, 'assignments', unifiedKey);
  const remoteSnap = !existing ? await getDoc(assignmentRef).catch(() => null) : null;
  const remoteExisting = remoteSnap?.exists()
    ? (remoteSnap.data() as UnifiedAssignmentRecord)
    : existing;

  // Idempotency guard: if already assigned and this is an automatic new_lead / new_conversation check,
  // merge any newly discovered leadId / conversationId without re-routing or re-notifying.
  if (
    remoteExisting?.assignedTo &&
    !forceReassign &&
    trigger !== 'handoff'
  ) {
    const nextConvIds = [
      ...new Set([
        ...(remoteExisting.conversationIds || []),
        ...(params.conversationId ? [params.conversationId] : []),
      ]),
    ];
    if (
      (resolvedLeadId && !remoteExisting.leadId) ||
      nextConvIds.length !== (remoteExisting.conversationIds || []).length
    ) {
      const merged: UnifiedAssignmentRecord = {
        ...remoteExisting,
        ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
        conversationIds: nextConvIds,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(assignmentRef, merged, { merge: true }).catch(() => null);
      await syncCanonicalLeadAndConversationDocs({
        scope,
        leadId: resolvedLeadId,
        conversationId: params.conversationId,
        assignedTo: merged.assignedTo,
        assignedAgentName: merged.assignedAgentName,
        takenOver: merged.takenOver,
        handoffTimestamp: merged.handoffTimestamp,
      });
      return merged;
    }
    return remoteExisting;
  }

  // On Human Handoff: if already assigned to an active on-shift Support agent, keep that agent;
  // otherwise run the shift-aware weighted routing engine (with Workspace Owner fallback).
  let selectedRoute: SelectedSupportRoute | null = null;
  if (trigger === 'handoff' && remoteExisting?.assignedTo && !forceReassign) {
    const currentAgent = members.find(
      m =>
        (m.authUid && m.authUid === remoteExisting.assignedTo) ||
        m.id === remoteExisting.assignedTo ||
        (m.email && normalizeEmail(m.email) === normalizeEmail(remoteExisting.assignedAgentEmail)),
    );
    if (
      currentAgent &&
      isSupportMemberRole(currentAgent) &&
      evaluateAgentShift(currentAgent).onShift
    ) {
      selectedRoute = {
        agentId: currentAgent.authUid || currentAgent.id,
        agentName: currentAgent.name,
        agentEmail: currentAgent.email,
        agentRole: currentAgent.role || 'Support',
        reason: 'shift_weighted',
        allocationPercent: currentAgent.leadAllocationPercent ?? 50,
      };
    }
  }

  if (!selectedRoute) {
    selectedRoute = selectSupportAssignee({
      members,
      existingAssignments,
      ownerFallback,
    });
  }

  const nowIso = new Date().toISOString();
  const isHandoff = trigger === 'handoff';
  const nextConvIds = [
    ...new Set([
      ...(remoteExisting?.conversationIds || []),
      ...(params.conversationId ? [params.conversationId] : []),
    ]),
  ];

  const record: UnifiedAssignmentRecord = {
    id: unifiedKey,
    unifiedKey,
    tenantId: scope,
    ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
    conversationIds: nextConvIds,
    customerName: customerName || matchedLead?.name || remoteExisting?.customerName || 'Lead',
    customerEmail: normalizeEmail(customerEmail || matchedLead?.email || remoteExisting?.customerEmail),
    customerPhone: customerPhone || matchedLead?.phone || remoteExisting?.customerPhone || '',
    channel: channel || remoteExisting?.channel || 'webchat',
    assignedTo: selectedRoute.agentId,
    assignedAgentName: selectedRoute.agentName,
    assignedAgentEmail: selectedRoute.agentEmail,
    assignedAgentRole: selectedRoute.agentRole,
    assignmentReason: isHandoff && selectedRoute.reason !== 'owner_fallback' ? 'handoff' : selectedRoute.reason,
    takenOver: isHandoff ? true : Boolean(remoteExisting?.takenOver),
    aiAutoReply: isHandoff ? false : remoteExisting?.aiAutoReply ?? true,
    status: 'open',
    ...(isHandoff ? { handoffTimestamp: nowIso } : remoteExisting?.handoffTimestamp ? { handoffTimestamp: remoteExisting.handoffTimestamp } : {}),
    assignedAt: remoteExisting?.assignedAt || nowIso,
    updatedAt: nowIso,
    ...(actorUid ? { updatedBy: actorUid } : {}),
  };

  await setDoc(assignmentRef, record, { merge: true }).catch(() => null);

  await syncCanonicalLeadAndConversationDocs({
    scope,
    leadId: resolvedLeadId,
    conversationId: params.conversationId || nextConvIds[0],
    assignedTo: record.assignedTo,
    assignedAgentName: record.assignedAgentName,
    takenOver: record.takenOver,
    handoffTimestamp: record.handoffTimestamp,
  });

  const primaryConvId = params.conversationId || nextConvIds[0] || '';
  const deepLink = primaryConvId
    ? `/dashboard/inbox?conversationId=${encodeURIComponent(primaryConvId)}${resolvedLeadId ? `&leadId=${encodeURIComponent(resolvedLeadId)}` : ''}`
    : resolvedLeadId
    ? `/dashboard/crm?leadId=${encodeURIComponent(resolvedLeadId)}`
    : '/dashboard/inbox';

  const recipientIds = [
    record.assignedTo,
    ...(selectedRoute.reason === 'owner_fallback' || isHandoff ? [ownerFallback.id, 'owner'] : []),
  ].filter(Boolean);
  const recipientEmails = [
    record.assignedAgentEmail || '',
    ...(selectedRoute.reason === 'owner_fallback' || isHandoff ? [ownerFallback.email] : []),
  ].filter(Boolean);

  if (isHandoff) {
    await pushWorkspaceNotification(scope, {
      id: `handoff_${unifiedKey}_${nowIso.slice(0, 16).replace(/[^0-9]/g, '')}`,
      type: 'conversation.handoff',
      category: 'Support',
      recipientIds,
      recipientEmails,
      titleEn: `Human Handoff: ${record.customerName}`,
      titleAr: `طلب تولي محادثة: ${record.customerName}`,
      detailEn:
        selectedRoute.reason === 'owner_fallback'
          ? `No support agent on shift · Routed to ${record.assignedAgentName}`
          : `Assigned to ${record.assignedAgentName} (${record.channel || 'Inbox'})`,
      detailAr:
        selectedRoute.reason === 'owner_fallback'
          ? `لا يوجد موظف دعم متاح بالشيفت · تم التحويل إلى ${record.assignedAgentName}`
          : `تم الإسناد إلى ${record.assignedAgentName} (${record.channel || 'صندوق الرسائل'})`,
      deepLink,
      leadId: resolvedLeadId,
      conversationId: primaryConvId,
      agentId: record.assignedTo,
      agentName: record.assignedAgentName,
    });
  } else {
    await pushWorkspaceNotification(scope, {
      id: `assign_${unifiedKey}`,
      type: 'lead.assigned',
      category: 'Support',
      recipientIds,
      recipientEmails,
      titleEn: `New Lead Assigned: ${record.customerName}`,
      titleAr: `عميل محتمل جديد مسند: ${record.customerName}`,
      detailEn:
        selectedRoute.reason === 'owner_fallback'
          ? `Fallback outside support shifts → ${record.assignedAgentName}`
          : `Auto-routed to ${record.assignedAgentName} (${selectedRoute.allocationPercent}% share)`,
      detailAr:
        selectedRoute.reason === 'owner_fallback'
          ? `تحويل تلقائي خارج أوقات الشيفت ← ${record.assignedAgentName}`
          : `توزيع تلقائي إلى ${record.assignedAgentName} (نسبة ${selectedRoute.allocationPercent}%)`,
      deepLink,
      leadId: resolvedLeadId,
      conversationId: primaryConvId,
      agentId: record.assignedTo,
      agentName: record.assignedAgentName,
    });
  }

  return record;
}

export async function assignUnifiedRecordManually(params: {
  scope: string;
  leadId?: string;
  conversationId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  channel?: string;
  agent: { id: string; name: string; email?: string; role?: string };
  existingAssignments: UnifiedAssignmentRecord[];
  actorUid?: string;
  stage?: string;
  tags?: string[];
}): Promise<UnifiedAssignmentRecord> {
  const { scope, agent, existingAssignments, actorUid } = params;
  const leads = store.getState().crm.leads;
  const matchedLead = matchLeadForIdentity(leads, {
    leadId: params.leadId,
    email: params.customerEmail,
    phone: params.customerPhone,
  });
  const resolvedLeadId = matchedLead?.id || params.leadId;
  const existing = findUnifiedAssignment(existingAssignments, {
    leadId: resolvedLeadId,
    conversationId: params.conversationId,
    email: params.customerEmail || matchedLead?.email,
    phone: params.customerPhone || matchedLead?.phone,
  });
  const unifiedKey =
    existing?.unifiedKey ||
    computeUnifiedKey(
      {
        leadId: resolvedLeadId,
        conversationId: params.conversationId,
        email: params.customerEmail || matchedLead?.email,
        phone: params.customerPhone || matchedLead?.phone,
      },
      leads,
    );

  const nowIso = new Date().toISOString();
  const nextConvIds = [
    ...new Set([
      ...(existing?.conversationIds || []),
      ...(params.conversationId ? [params.conversationId] : []),
    ]),
  ];

  const record: UnifiedAssignmentRecord = {
    id: unifiedKey,
    unifiedKey,
    tenantId: scope,
    ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
    conversationIds: nextConvIds,
    customerName: params.customerName || matchedLead?.name || existing?.customerName || 'Lead',
    customerEmail: normalizeEmail(params.customerEmail || matchedLead?.email || existing?.customerEmail),
    customerPhone: params.customerPhone || matchedLead?.phone || existing?.customerPhone || '',
    channel: params.channel || existing?.channel || 'webchat',
    assignedTo: agent.id,
    assignedAgentName: agent.name,
    assignedAgentEmail: normalizeEmail(agent.email),
    assignedAgentRole: agent.role || 'Support',
    assignmentReason: 'manual',
    takenOver: existing?.takenOver ?? false,
    aiAutoReply: existing?.aiAutoReply ?? true,
    status: existing?.status || 'open',
    ...(params.stage ? { stage: params.stage } : existing?.stage ? { stage: existing.stage } : {}),
    ...(params.tags ? { tags: params.tags } : existing?.tags ? { tags: existing.tags } : {}),
    ...(existing?.handoffTimestamp ? { handoffTimestamp: existing.handoffTimestamp } : {}),
    assignedAt: nowIso,
    updatedAt: nowIso,
    ...(actorUid ? { updatedBy: actorUid } : {}),
  };

  await setDoc(
    doc(db, 'settings', `supportRouting_${scope}`, 'assignments', unifiedKey),
    record,
    { merge: true },
  ).catch(() => null);

  await syncCanonicalLeadAndConversationDocs({
    scope,
    leadId: resolvedLeadId,
    conversationId: params.conversationId || nextConvIds[0],
    assignedTo: record.assignedTo,
    assignedAgentName: record.assignedAgentName,
    takenOver: record.takenOver,
    handoffTimestamp: record.handoffTimestamp,
    stage: params.stage,
  });

  const primaryConvId = params.conversationId || nextConvIds[0] || '';
  const deepLink = primaryConvId
    ? `/dashboard/inbox?conversationId=${encodeURIComponent(primaryConvId)}${resolvedLeadId ? `&leadId=${encodeURIComponent(resolvedLeadId)}` : ''}`
    : resolvedLeadId
    ? `/dashboard/crm?leadId=${encodeURIComponent(resolvedLeadId)}`
    : '/dashboard/inbox';

  if (existing?.assignedTo !== agent.id || existing?.assignedAgentName !== agent.name) {
    void pushWorkspaceNotification(scope, {
      type: 'lead.assigned',
      category: 'Support',
      recipientIds: [agent.id].filter(Boolean),
      recipientEmails: [agent.email || ''].filter(Boolean),
      titleEn: `Conversation / Lead Assigned: ${record.customerName}`,
      titleAr: `تم إسناد عميل / محادثة إليك: ${record.customerName}`,
      detailEn: `Assigned to ${agent.name}`,
      detailAr: `تم الإسناد إلى ${agent.name}`,
      deepLink,
      leadId: resolvedLeadId,
      conversationId: primaryConvId,
      agentId: agent.id,
      agentName: agent.name,
    });
  }

  return record;
}

export async function updateUnifiedConversationMeta(params: {
  scope: string;
  leadId?: string;
  conversationId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  existingAssignments: UnifiedAssignmentRecord[];
  patch: Partial<Pick<UnifiedAssignmentRecord, 'takenOver' | 'aiAutoReply' | 'status' | 'stage' | 'tags'>>;
}): Promise<void> {
  const { scope, existingAssignments, patch } = params;
  if (!scope) return;
  const leads = store.getState().crm.leads;
  const matchedLead = matchLeadForIdentity(leads, {
    leadId: params.leadId,
    email: params.customerEmail,
    phone: params.customerPhone,
  });
  const resolvedLeadId = matchedLead?.id || params.leadId;
  const existing = findUnifiedAssignment(existingAssignments, {
    leadId: resolvedLeadId,
    conversationId: params.conversationId,
    email: params.customerEmail || matchedLead?.email,
    phone: params.customerPhone || matchedLead?.phone,
  });
  const unifiedKey =
    existing?.unifiedKey ||
    computeUnifiedKey(
      {
        leadId: resolvedLeadId,
        conversationId: params.conversationId,
        email: params.customerEmail || matchedLead?.email,
        phone: params.customerPhone || matchedLead?.phone,
      },
      leads,
    );
  const nowIso = new Date().toISOString();

  await setDoc(
    doc(db, 'settings', `supportRouting_${scope}`, 'assignments', unifiedKey),
    {
      id: unifiedKey,
      unifiedKey,
      tenantId: scope,
      ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
      conversationIds: [
        ...new Set([
          ...(existing?.conversationIds || []),
          ...(params.conversationId ? [params.conversationId] : []),
        ]),
      ],
      customerName: params.customerName || matchedLead?.name || existing?.customerName || 'Lead',
      ...(existing ? {} : { assignedTo: '', assignedAgentName: matchedLead?.owner || 'Unassigned', assignmentReason: 'manual', status: 'open', assignedAt: nowIso }),
      ...patch,
      updatedAt: nowIso,
    },
    { merge: true },
  ).catch(() => null);

  if (resolvedLeadId && patch.takenOver === false) {
    store.dispatch(
      setLeadFollowUpState({
        id: resolvedLeadId,
        followUpState: 'CONVERSING',
        detail: 'Conversation handed back to AI assistant',
      }),
    );
    await setDoc(
      doc(db, 'tenants', scope, 'leads', resolvedLeadId),
      { followUpState: 'CONVERSING', lastActivity: nowIso },
      { merge: true },
    ).catch(() => null);
  }
  if (resolvedLeadId && patch.stage) {
    store.dispatch(
      updateLead({
        id: resolvedLeadId,
        changes: {
          stage: patch.stage as CanonicalLead['stage'],
          lifecycleStage: patch.stage as CanonicalLead['lifecycleStage'],
        },
      }),
    );
    await setDoc(
      doc(db, 'tenants', scope, 'leads', resolvedLeadId),
      { stage: patch.stage, lifecycleStage: patch.stage, lastActivity: nowIso },
      { merge: true },
    ).catch(() => null);
  }
  if (params.conversationId && !params.conversationId.startsWith('crm-')) {
    await setDoc(
      doc(db, 'tenants', scope, 'conversations', params.conversationId),
      { ...patch, updatedAt: nowIso },
      { merge: true },
    ).catch(() => null);
  }
}

export function useWorkspaceTeamMembers() {
  const authState = useSelector((state: RootState) => state.auth);
  const entityMembers = useEntities<Partial<Member> & { id: string }>('members');
  const [settingsMembers, setSettingsMembers] = useState<Member[]>([]);
  const [localTick, setLocalTick] = useState(0);

  const scope = authState.tenant?.id || authState.user?.id || '';

  useEffect(() => {
    const onLocal = () => setLocalTick(v => v + 1);
    window.addEventListener('gos-settings-changed', onLocal);
    return () => window.removeEventListener('gos-settings-changed', onLocal);
  }, []);

  useEffect(() => {
    if (!scope) {
      setSettingsMembers([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'settings', `team_${scope}`, 'members'),
      snap => {
        const list: Member[] = [];
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (!data || data.deleted) continue;
          list.push(normalizeMemberRecord({ ...data, id: docSnap.id }));
        }
        setSettingsMembers(list);
      },
      () => setSettingsMembers([]),
    );
    return unsub;
  }, [scope]);

  const ownerFallback = useMemo(() => {
    const fromSettingsOwner = settingsMembers.find(m => m.isOwner || m.role === 'Owner');
    if (fromSettingsOwner) {
      return {
        id: fromSettingsOwner.authUid || fromSettingsOwner.id,
        name: fromSettingsOwner.name || 'Workspace Owner',
        email: fromSettingsOwner.email || '',
      };
    }
    const fromEntityOwner = entityMembers.find(
      m => m.isOwner || String(m.role || '').toLowerCase() === 'owner',
    );
    if (fromEntityOwner && fromEntityOwner.name) {
      return {
        id: fromEntityOwner.id,
        name: fromEntityOwner.name,
        email: fromEntityOwner.email || '',
      };
    }
    if (authState.user?.isTeamMember && authState.user.ownerId) {
      return {
        id: authState.user.ownerId,
        name: authState.user.ownerName || 'Workspace Owner',
        email: authState.user.ownerEmail || '',
      };
    }
    return {
      id: authState.user?.id || scope || 'owner',
      name: authState.user?.name || 'Workspace Owner',
      email: authState.user?.email || '',
    };
  }, [authState.user, entityMembers, scope, settingsMembers]);

  const members = useMemo(() => {
    void localTick;
    const byEmailOrId = new Map<string, Member>();

    const upsert = (raw: Partial<Member> & Record<string, any>) => {
      if (!raw || raw.deleted) return;
      const norm = normalizeMemberRecord(raw);
      if (!norm.name && !norm.email) return;
      const key = normalizeEmail(norm.email) || norm.authUid || norm.id;
      if (!key) return;
      const prev = byEmailOrId.get(key);
      if (!prev) {
        byEmailOrId.set(key, norm);
      } else {
        byEmailOrId.set(key, {
          ...prev,
          ...norm,
          leadAllocationPercent: norm.leadAllocationPercent ?? prev.leadAllocationPercent,
          shiftSchedule: norm.shiftSchedule ?? prev.shiftSchedule,
        });
      }
    };

    for (const m of readTeam().members) upsert(m);
    for (const m of entityMembers) upsert(m);
    for (const m of settingsMembers) upsert(m);

    const ownerKey = normalizeEmail(ownerFallback.email) || ownerFallback.id;
    if (ownerKey && !byEmailOrId.has(ownerKey)) {
      upsert({
        id: ownerFallback.id,
        name: ownerFallback.name,
        email: ownerFallback.email,
        role: 'Owner',
        isOwner: true,
        active: true,
        permissions: ['*'],
      });
    }

    return [...byEmailOrId.values()].sort((a, b) => {
      const aOwn = a.isOwner || a.role === 'Owner' ? 0 : 1;
      const bOwn = b.isOwner || b.role === 'Owner' ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.name.localeCompare(b.name);
    });
  }, [entityMembers, localTick, ownerFallback, settingsMembers]);

  const supportAgents = useMemo(
    () => members.filter(m => !m.isOwner && m.role !== 'Owner' && isSupportMemberRole(m)),
    [members],
  );

  return { scope, members, supportAgents, ownerFallback };
}

export function useSupportRouting() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { scope, members, supportAgents, ownerFallback } = useWorkspaceTeamMembers();
  const [assignments, setAssignments] = useState<UnifiedAssignmentRecord[]>([]);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(t => t + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scope) {
      setAssignments([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'settings', `supportRouting_${scope}`, 'assignments'),
      snap => {
        const rows: UnifiedAssignmentRecord[] = [];
        for (const docSnap of snap.docs) {
          const d = docSnap.data() as Partial<UnifiedAssignmentRecord>;
          if (!d) continue;
          rows.push({
            id: d.id || docSnap.id,
            unifiedKey: d.unifiedKey || docSnap.id,
            tenantId: d.tenantId || scope,
            leadId: d.leadId,
            conversationIds: Array.isArray(d.conversationIds) ? d.conversationIds : [],
            customerName: String(d.customerName || 'Lead'),
            customerEmail: d.customerEmail || '',
            customerPhone: d.customerPhone || '',
            channel: d.channel || 'webchat',
            assignedTo: String(d.assignedTo || ''),
            assignedAgentName: String(d.assignedAgentName || ''),
            assignedAgentEmail: d.assignedAgentEmail || '',
            assignedAgentRole: d.assignedAgentRole || '',
            assignmentReason: d.assignmentReason || 'manual',
            takenOver: Boolean(d.takenOver),
            aiAutoReply: d.aiAutoReply !== false,
            status: d.status === 'resolved' ? 'resolved' : 'open',
            stage: d.stage,
            tags: Array.isArray(d.tags) ? d.tags : undefined,
            handoffTimestamp: d.handoffTimestamp,
            assignedAt: String(d.assignedAt || d.updatedAt || new Date().toISOString()),
            updatedAt: String(d.updatedAt || new Date().toISOString()),
            updatedBy: d.updatedBy,
          });
        }
        rows.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
        setAssignments(rows);
      },
      () => setAssignments([]),
    );
    return unsub;
  }, [scope]);

  const getShiftStatus = useCallback(
    (member: Member) => {
      void clockTick;
      return evaluateAgentShift(member, new Date());
    },
    [clockTick],
  );

  const findAssignment = useCallback(
    (target: { leadId?: string; conversationId?: string; email?: string; phone?: string }) =>
      findUnifiedAssignment(assignments, target),
    [assignments],
  );

  const routeRecord = useCallback(
    (input: {
      trigger: 'new_lead' | 'new_conversation' | 'handoff';
      leadId?: string;
      conversationId?: string;
      customerName: string;
      customerEmail?: string;
      customerPhone?: string;
      channel?: string;
      forceReassign?: boolean;
    }) =>
      routeUnifiedLeadOrConversation({
        scope,
        ...input,
        members,
        existingAssignments: assignments,
        ownerFallback,
        actorUid: authUser?.id,
      }),
    [assignments, authUser?.id, members, ownerFallback, scope],
  );

  const manualAssign = useCallback(
    (input: {
      leadId?: string;
      conversationId?: string;
      customerName: string;
      customerEmail?: string;
      customerPhone?: string;
      channel?: string;
      agent: { id: string; name: string; email?: string; role?: string };
      stage?: string;
      tags?: string[];
    }) =>
      assignUnifiedRecordManually({
        scope,
        ...input,
        existingAssignments: assignments,
        actorUid: authUser?.id,
      }),
    [assignments, authUser?.id, scope],
  );

  const updateMeta = useCallback(
    (input: {
      leadId?: string;
      conversationId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      patch: Partial<Pick<UnifiedAssignmentRecord, 'takenOver' | 'aiAutoReply' | 'status' | 'stage' | 'tags'>>;
    }) =>
      updateUnifiedConversationMeta({
        scope,
        ...input,
        existingAssignments: assignments,
      }),
    [assignments, scope],
  );

  return {
    scope,
    members,
    supportAgents,
    ownerFallback,
    assignments,
    clockTick,
    getShiftStatus,
    findAssignment,
    routeRecord,
    manualAssign,
    updateMeta,
  };
}
