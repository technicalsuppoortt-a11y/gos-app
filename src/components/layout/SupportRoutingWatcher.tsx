import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { updateLead } from '../../store/slices/crmSlice';
import { useEntities } from '../../backend/workspace';
import { gosApi } from '../../backend/gosApi';
import { normalizeConversation } from '../../backend/useGosInbox';
import type { Conversation } from '../../pages/inbox/inboxData';
import { evaluateAgentShift, useSupportRouting } from '../../backend/supportRouting';
import { pushWorkspaceNotification } from '../../backend/notifications';

/**
 * Background workspace watcher that:
 * 1. Automatically routes newly arriving unassigned leads & conversations via the weighted
 *    on-shift Support routing engine (falling back to Workspace Owner when 0 agents on shift).
 * 2. Detects live Support shift transitions (On Shift <-> Off Shift) and dispatches
 *    real-time top-bar notifications.
 */
export function SupportRoutingWatcher() {
  const dispatch = useDispatch();
  const location = useLocation();
  const crmLeads = useSelector((state: RootState) => state.crm.leads);
  const cloudConversations = useEntities<Conversation>('conversations');

  const {
    scope,
    supportAgents,
    ownerFallback,
    assignments,
    clockTick,
    findAssignment,
    routeRecord,
  } = useSupportRouting();

  const baselineReadyRef = useRef(false);
  const seenLeadIdsRef = useRef<Set<string>>(new Set());
  const seenConvIdsRef = useRef<Set<string>>(new Set());
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const prevShiftMapRef = useRef<Map<string, boolean>>(new Map());

  // Reset tracking when workspace scope changes
  useEffect(() => {
    baselineReadyRef.current = false;
    seenLeadIdsRef.current = new Set();
    seenConvIdsRef.current = new Set();
    inFlightKeysRef.current = new Set();
    prevShiftMapRef.current = new Map();

    const timer = window.setTimeout(() => {
      baselineReadyRef.current = true;
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [scope]);

  // 1. Watch CRM Leads for newly entering unassigned leads
  useEffect(() => {
    if (!scope || !crmLeads.length) return;

    const nowMs = Date.now();
    for (const lead of crmLeads) {
      if (!lead?.id) continue;
      const alreadySeen = seenLeadIdsRef.current.has(lead.id);
      seenLeadIdsRef.current.add(lead.id);

      const createdMs = lead.createdAt ? Date.parse(lead.createdAt) : NaN;
      const isVeryRecent = Number.isFinite(createdMs) && nowMs - createdMs < 90_000;

      // Skip historical baseline rows so page reloads never mass-reassign legacy leads
      if (!baselineReadyRef.current && !isVeryRecent) continue;
      if (alreadySeen && !isVeryRecent) continue;

      const ownerClean = (lead.assignedAgentName || lead.owner || '').trim();
      const isUnassigned =
        !lead.assignedTo &&
        (!ownerClean || ownerClean.toLowerCase() === 'unassigned');
      if (!isUnassigned) continue;

      const existing = findAssignment({
        leadId: lead.id,
        email: lead.email,
        phone: lead.phone,
      });
      if (existing?.assignedTo) continue;

      const guardKey = `lead:${lead.id}`;
      if (inFlightKeysRef.current.has(guardKey)) continue;
      inFlightKeysRef.current.add(guardKey);

      void routeRecord({
        trigger: lead.followUpState === 'HUMAN_HANDOFF' ? 'handoff' : 'new_lead',
        leadId: lead.id,
        customerName: lead.name || lead.email || 'New Lead',
        customerEmail: lead.email,
        customerPhone: lead.phone,
        channel: lead.source || 'crm',
      }).finally(() => {
        window.setTimeout(() => inFlightKeysRef.current.delete(guardKey), 10_000);
      });
    }
  }, [scope, crmLeads, assignments.length, findAssignment, routeRecord]);

  // 2. Watch Firestore Conversations for newly entering unassigned conversations or handoffs
  useEffect(() => {
    if (!scope || !cloudConversations.length) return;

    for (const conv of cloudConversations) {
      if (!conv?.id) continue;
      const alreadySeen = seenConvIdsRef.current.has(conv.id);
      seenConvIdsRef.current.add(conv.id);

      if (!baselineReadyRef.current) continue;

      const existing = findAssignment({
        conversationId: conv.id,
        email: conv.email,
        phone: conv.phone,
      });

      const assigneeClean = (conv.assignee || '').trim();
      const isUnassigned = !assigneeClean || assigneeClean.toLowerCase() === 'unassigned';
      const needsInitialRoute = !alreadySeen && isUnassigned && !existing?.assignedTo;
      const needsHandoffRoute = Boolean(conv.takenOver) && !existing?.takenOver && isUnassigned;

      if (!needsInitialRoute && !needsHandoffRoute) continue;

      const guardKey = `conv:${conv.id}:${needsHandoffRoute ? 'handoff' : 'new'}`;
      if (inFlightKeysRef.current.has(guardKey)) continue;
      inFlightKeysRef.current.add(guardKey);

      void routeRecord({
        trigger: conv.takenOver ? 'handoff' : 'new_conversation',
        conversationId: conv.id,
        customerName: conv.name || conv.email || 'Visitor',
        customerEmail: conv.email,
        customerPhone: conv.phone,
        channel: conv.channel || 'webchat',
      }).finally(() => {
        window.setTimeout(() => inFlightKeysRef.current.delete(guardKey), 10_000);
      });
    }
  }, [scope, cloudConversations, assignments.length, findAssignment, routeRecord]);

  // 3. Lightweight background check for live API conversations when not on Inbox/Follow-Up
  useEffect(() => {
    if (!scope || import.meta.env.VITE_LOCAL_DEMO === 'true') return;
    if (
      location.pathname.startsWith('/dashboard/inbox') ||
      location.pathname.startsWith('/dashboard/follow-up')
    ) {
      return;
    }

    const controller = new AbortController();
    let initialized = false;

    const pollLiveConversations = async () => {
      try {
        const res = await gosApi.conversations(controller.signal);
        if (controller.signal.aborted || !Array.isArray(res.conversations)) return;
        const normalized = res.conversations.map(r => normalizeConversation(r));

        if (!initialized) {
          initialized = true;
          for (const c of normalized) {
            if (c.id) seenConvIdsRef.current.add(c.id);
          }
          return;
        }

        for (const conv of normalized) {
          if (!conv.id) continue;
          const isNew = !seenConvIdsRef.current.has(conv.id);
          seenConvIdsRef.current.add(conv.id);
          if (!isNew && !conv.takenOver) continue;

          const existing = findAssignment({
            conversationId: conv.id,
            email: conv.email,
            phone: conv.phone,
          });
          if (existing?.assignedTo && (!conv.takenOver || existing.takenOver)) continue;

          const assigneeClean = (conv.assignee || '').trim();
          if (assigneeClean && assigneeClean.toLowerCase() !== 'unassigned') continue;

          const guardKey = `liveconv:${conv.id}`;
          if (inFlightKeysRef.current.has(guardKey)) continue;
          inFlightKeysRef.current.add(guardKey);

          await routeRecord({
            trigger: conv.takenOver ? 'handoff' : 'new_conversation',
            conversationId: conv.id,
            customerName: conv.name || conv.email || 'Visitor',
            customerEmail: conv.email,
            customerPhone: conv.phone,
            channel: conv.channel || 'webchat',
          });
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    void pollLiveConversations();
    const interval = window.setInterval(() => void pollLiveConversations(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [scope, location.pathname, findAssignment, routeRecord]);

  // 4. Live Support Shift Status Transition Notifications (On Shift <-> Off Shift)
  useEffect(() => {
    if (!scope || !supportAgents.length) return;
    const now = new Date();
    const hourStamp = now.toISOString().slice(0, 13).replace(/[^0-9]/g, '');

    for (const agent of supportAgents) {
      if (agent.active === false) {
        prevShiftMapRef.current.set(agent.id, false);
        continue;
      }
      const evalResult = evaluateAgentShift(agent, now);
      const prev = prevShiftMapRef.current.get(agent.id);
      prevShiftMapRef.current.set(agent.id, evalResult.onShift);

      if (prev === undefined || prev === evalResult.onShift) continue;

      const deterministicId = `shift_status_${agent.id}_${hourStamp}_${
        evalResult.onShift ? 'on' : 'off'
      }`;
      const recipientIds = [
        agent.id,
        ...(agent.authUid ? [agent.authUid] : []),
        ownerFallback.id,
        'owner',
      ].filter(Boolean);
      const recipientEmails = [agent.email, ownerFallback.email].filter(Boolean);

      void pushWorkspaceNotification(scope, {
        id: deterministicId,
        type: 'shift.status',
        category: 'Support',
        recipientIds,
        recipientEmails,
        agentId: agent.id,
        agentName: agent.name,
        titleEn: evalResult.onShift
          ? `Shift Started: ${agent.name} is now On Shift`
          : `Shift Ended: ${agent.name} is now Off Shift`,
        titleAr: evalResult.onShift
          ? `بدء الشيفت: ${agent.name} متاح الآن في الشيفت`
          : `انتهاء الشيفت: ${agent.name} خارج الشيفت الآن`,
        detailEn: evalResult.onShift
          ? `Lead routing (${agent.leadAllocationPercent ?? 50}%) is now active for ${agent.name} (${evalResult.scheduleLabel}).`
          : `${agent.name} completed shift hours. Incoming conversations route to on-shift agents or ${ownerFallback.name}.`,
        detailAr: evalResult.onShift
          ? `تم تفعيل توزيع العملاء (${agent.leadAllocationPercent ?? 50}%) للموظف ${agent.name}.`
          : `انتهت ساعات شيفت ${agent.name}. سيتم توجيه المحادثات الجديدة للموظفين المتاحين أو مالك الحساب (${ownerFallback.name}).`,
        deepLink: '/dashboard/settings/support-team',
      });
    }
  }, [scope, supportAgents, ownerFallback.id, ownerFallback.email, ownerFallback.name, clockTick]);

  // 5. Real-Time Single Source of Truth Sync: mirror unified Firestore assignments onto Redux CRM leads
  useEffect(() => {
    if (!assignments.length || !crmLeads.length) return;
    for (const lead of crmLeads) {
      const matched = findAssignment({
        leadId: lead.id,
        email: lead.email,
        phone: lead.phone,
      });
      if (!matched || !matched.assignedAgentName) continue;
      const needsOwnerSync =
        lead.assignedTo !== matched.assignedTo ||
        lead.assignedAgentName !== matched.assignedAgentName ||
        lead.owner !== matched.assignedAgentName ||
        (matched.takenOver && lead.followUpState !== 'HUMAN_HANDOFF' && matched.handoffTimestamp !== lead.handoffTimestamp);
      if (!needsOwnerSync) continue;

      dispatch(
        updateLead({
          id: lead.id,
          changes: {
            owner: matched.assignedAgentName,
            assignedTo: matched.assignedTo,
            assignedAgentName: matched.assignedAgentName,
            ...(matched.handoffTimestamp ? { handoffTimestamp: matched.handoffTimestamp } : {}),
            ...(matched.takenOver ? { followUpState: 'HUMAN_HANDOFF' } : {}),
          },
        }),
      );
    }
  }, [assignments, crmLeads, dispatch, findAssignment]);

  return null;
}
