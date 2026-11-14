import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Headset,
  MessageSquare,
  Pencil,
  Percent,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { RootState } from '../../store';
import type { CanonicalLead } from '../../store/slices/crmSlice';
import { useUILanguage, translateText, localizeNode } from '../../i18n/display';
import { useCurrency } from '../../context/CurrencyContext';
import { useEntities } from '../../backend/workspace';
import { useGosInbox } from '../../backend/useGosInbox';
import type { Conversation } from '../inbox/inboxData';
import {
  evaluateAgentShift,
  useSupportRouting,
  type UnifiedAssignmentRecord,
} from '../../backend/supportRouting';
import {
  ALL_SHIFT_DAYS,
  buildTabPermissionsMap,
  defaultSupportShiftSchedule,
  defaultWorkspaceTimezone,
  isSupportMemberRole,
  readTeam,
  saveLocal,
  type DayCode,
  type Member,
  type SupportShiftSchedule,
} from './localState';
import { friendlyError, settingsApiEnabled, settingsRequest } from './data';
import { Badge, Card, Field, Modal, PanelHeading, Toggle } from './kit';
import { Select } from '../../components/ui/Select';
import { matchesLocalizedSearch } from '../../utils/arabicSearch';
import { showToast } from '../../utils/toast';

interface OrderLike {
  id?: string;
  orderNumber?: string;
  requestId?: string;
  customer?: string;
  customerName?: string;
  email?: string;
  customerEmail?: string;
  phone?: string;
  customerPhone?: string;
  leadId?: string;
  product?: string;
  productName?: string;
  amount?: number | string;
  total?: number | string;
  price?: number | string;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  date?: string;
  assignedTo?: string;
}

interface AttributedLeadItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  value: number;
  assignedAt: string;
}

interface AttributedConversationItem {
  id: string;
  leadId?: string;
  name: string;
  channel: string;
  preview: string;
  status: 'handoff' | 'resolved' | 'active';
  updatedAt: string;
}

interface AttributedSaleItem {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  amountInWorkspaceCurrency: number;
  rawAmount: number;
  sourceCurrency: string;
  date: string;
  reference: string;
}

interface AgentStats {
  member: Member;
  isOwnerFallback: boolean;
  onShift: boolean;
  shiftInfo: ReturnType<typeof evaluateAgentShift>;
  effectiveSharePercent: number;
  leads: AttributedLeadItem[];
  conversations: AttributedConversationItem[];
  activeConversationsCount: number;
  resolvedConversationsCount: number;
  handoffConversationsCount: number;
  sales: AttributedSaleItem[];
  totalRevenueWorkspaceCurrency: number;
}

const TIMEZONE_SELECT_OPTIONS = [
  { value: 'Africa/Cairo', label: 'Africa/Cairo (GMT+2/+3)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (GMT+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Asia/Kuwait', label: 'Asia/Kuwait (GMT+3)' },
  { value: 'Asia/Qatar', label: 'Asia/Qatar (GMT+3)' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (GMT+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0/+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
];

function parseNumericAmount(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePhoneDigits(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function SupportTeamPanel() {
  useUILanguage();
  const navigate = useNavigate();
  const { currency, convertAmount, formatPrice } = useCurrency();

  const user = useSelector((state: RootState) => state.auth.user);
  const tenant = useSelector((state: RootState) => state.auth.tenant);
  const role = useSelector((state: RootState) => state.auth.role);
  const crmLeads = useSelector((state: RootState) => state.crm.leads);

  const { members, assignments, ownerFallback } = useSupportRouting();

  // Live & Workspace Conversations + Commerce Records for Attribution
  const liveInboxEnabled = import.meta.env.VITE_LOCAL_DEMO !== 'true';
  const gosInbox = useGosInbox(liveInboxEnabled, '');
  const cloudConversations = useEntities<Conversation>('conversations');
  const orders = useEntities<OrderLike>('orders');
  const transactions = useEntities<OrderLike>('transactions');

  const [nowTick, setNowTick] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'on' | 'off'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'leads' | 'conversations' | 'sales'>('leads');
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Keep live shift clock refreshed every 30s
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const canManage = useMemo(() => {
    if (!settingsApiEnabled) return true;
    if (!user) return true;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
    if (!tenant?.id || tenant.id === user.id || tenant.id === `workspace-${user.id}`) return true;
    const me = members.find(
      m => m.id === user.id || m.email?.toLowerCase() === user.email?.toLowerCase(),
    );
    if (!me) return true;
    return (
      Boolean(me.isOwner) ||
      ['Owner', 'Admin', 'Manager'].includes(me.role) ||
      me.permissions?.includes('*') ||
      me.permissions?.includes('settings:team') ||
      me.permissions?.includes('settings:support-team')
    );
  }, [user, tenant?.id, role, members]);

  // Build unified Support members list + Owner fallback descriptor
  const supportMembers = useMemo(
    () => members.filter(m => !m.isOwner && m.role !== 'Owner' && isSupportMemberRole(m)),
    [members],
  );

  const ownerMember = useMemo<Member>(() => {
    const found = members.find(m => m.isOwner || m.role === 'Owner');
    if (found) return found;
    return {
      id: ownerFallback.id,
      name: ownerFallback.name,
      email: ownerFallback.email,
      role: 'Owner',
      active: true,
      isOwner: true,
      permissions: ['*'],
      leadAllocationPercent: 100,
      shiftSchedule: { ...defaultSupportShiftSchedule(), enabled: false },
    };
  }, [members, ownerFallback]);

  // Merge conversations from GosInbox + Firestore conversations + routed assignments
  const mergedConversations = useMemo<Conversation[]>(() => {
    const byId = new Map<string, Conversation>();
    for (const c of cloudConversations) {
      if (c?.id) byId.set(c.id, c);
    }
    for (const c of gosInbox.conversations) {
      if (c?.id) byId.set(c.id, { ...byId.get(c.id), ...c });
    }
    return Array.from(byId.values());
  }, [cloudConversations, gosInbox.conversations]);

  // Compute full Per-Agent Performance & Attribution
  const agentStatsList = useMemo<AgentStats[]>(() => {
    const allAssignments: UnifiedAssignmentRecord[] = assignments;

    // Evaluate live shift states first to compute effective on-shift pool share
    const evaluatedSupport = supportMembers.map(m => ({
      member: m,
      shiftInfo: evaluateAgentShift(m, nowTick),
    }));
    const onShiftTotalWeight = evaluatedSupport
      .filter(item => item.shiftInfo.onShift)
      .reduce(
        (sum, item) => sum + Math.max(1, Number(item.member.leadAllocationPercent ?? 50)),
        0,
      );

    const buildMatcherForAgent = (agent: Member, isOwnerCard: boolean) => {
      const idLower = (agent.id || '').toLowerCase();
      const authUidLower = (agent.authUid || '').toLowerCase();
      const nameLower = (agent.name || '').trim().toLowerCase();
      const emailLower = (agent.email || '').trim().toLowerCase();

      return {
        matchesAssignment(a?: UnifiedAssignmentRecord | null): boolean {
          if (!a) return false;
          const assignedToLower = (a.assignedTo || '').toLowerCase();
          if (assignedToLower && (assignedToLower === idLower || (authUidLower && assignedToLower === authUidLower))) {
            return true;
          }
          if (emailLower && a.assignedAgentEmail?.toLowerCase() === emailLower) return true;
          if (nameLower && a.assignedAgentName?.trim().toLowerCase() === nameLower) return true;
          if (
            isOwnerCard &&
            a.assignmentReason === 'owner_fallback' &&
            !supportMembers.some(
              s => s.id === a.assignedTo || (s.authUid && s.authUid === a.assignedTo),
            )
          ) {
            return true;
          }
          return false;
        },
        matchesOwnerField(ownerValue?: string, assignedToId?: string): boolean {
          const targetId = (assignedToId || '').toLowerCase();
          if (targetId && (targetId === idLower || (authUidLower && targetId === authUidLower))) {
            return true;
          }
          const clean = (ownerValue || '').trim().toLowerCase();
          if (!clean || clean === 'unassigned') return false;
          if (clean === idLower || (nameLower && clean === nameLower) || (emailLower && clean === emailLower)) {
            return true;
          }
          return false;
        },
      };
    };

    // Index assignments by leadId, conversationId, email, phone
    const findAssignmentForLead = (lead: CanonicalLead): UnifiedAssignmentRecord | undefined => {
      const leadEmail = (lead.email || '').trim().toLowerCase();
      const leadPhone = normalizePhoneDigits(lead.phone);
      return allAssignments.find(
        a =>
          (a.leadId && a.leadId === lead.id) ||
          (leadEmail && a.customerEmail?.toLowerCase() === leadEmail) ||
          (leadPhone.length >= 7 && normalizePhoneDigits(a.customerPhone) === leadPhone),
      );
    };

    const findAssignmentForConv = (conv: Conversation): UnifiedAssignmentRecord | undefined => {
      const convEmail = (conv.email || '').trim().toLowerCase();
      const convPhone = normalizePhoneDigits(conv.phone);
      return allAssignments.find(
        a =>
          (Array.isArray(a.conversationIds) && a.conversationIds.includes(conv.id)) ||
          a.unifiedKey === `conv_${conv.id}` ||
          (convEmail && a.customerEmail?.toLowerCase() === convEmail) ||
          (convPhone.length >= 7 && normalizePhoneDigits(a.customerPhone) === convPhone),
      );
    };

    // Consolidate paid commerce records (orders + checkoutRequests + transactions) without double counting
    const paidCommerceItems: {
      key: string;
      title: string;
      customerName: string;
      email: string;
      phone: string;
      leadId: string;
      assignedTo: string;
      rawAmount: number;
      currency: string;
      date: string;
      reference: string;
    }[] = [];
    const seenCommerceKeys = new Set<string>();

    const ingestCommerceRow = (row: OrderLike, kind: string) => {
      if (!row) return;
      const status = String(row.status || row.paymentStatus || '').toLowerCase();
      const isPaid =
        status === 'paid' ||
        status === 'approved' ||
        status === 'completed' ||
        status === 'succeeded' ||
        status === 'active';
      if (!isPaid) return;

      const rawAmount = parseNumericAmount(row.total ?? row.amount ?? row.price);
      if (rawAmount <= 0) return;

      const dedupeKey = String(
        row.requestId || row.orderNumber || row.id || `${kind}-${row.email}-${rawAmount}`,
      ).toLowerCase();
      if (seenCommerceKeys.has(dedupeKey)) return;
      seenCommerceKeys.add(dedupeKey);

      paidCommerceItems.push({
        key: dedupeKey,
        title: String(row.productName || row.product || translateText('Product Purchase')),
        customerName: String(row.customerName || row.customer || translateText('Customer')),
        email: String(row.customerEmail || row.email || '').trim().toLowerCase(),
        phone: normalizePhoneDigits(row.customerPhone || row.phone),
        leadId: String(row.leadId || ''),
        assignedTo: String(row.assignedTo || ''),
        rawAmount,
        currency: String(row.currency || currency || 'USD').toUpperCase(),
        date: String(row.createdAt || row.date || ''),
        reference: String(row.orderNumber || row.requestId || row.id || '').slice(0, 12),
      });
    };

    orders.forEach(o => ingestCommerceRow(o, 'ord'));
    transactions.forEach(tx => ingestCommerceRow(tx, 'tx'));

    const computeForMember = (
      member: Member,
      shiftInfo: ReturnType<typeof evaluateAgentShift>,
      isOwnerFallback: boolean,
    ): AgentStats => {
      const matcher = buildMatcherForAgent(member, isOwnerFallback);
      const leadMap = new Map<string, AttributedLeadItem>();
      const agentEmails = new Set<string>();
      const agentPhones = new Set<string>();
      const agentLeadIds = new Set<string>();

      // 1. Match CRM leads
      for (const lead of crmLeads) {
        const linkedAssign = findAssignmentForLead(lead);
        const isMine = linkedAssign
          ? matcher.matchesAssignment(linkedAssign)
          : matcher.matchesOwnerField(lead.assignedAgentName || lead.owner, lead.assignedTo);

        if (isMine) {
          agentLeadIds.add(lead.id);
          if (lead.email) agentEmails.add(lead.email.trim().toLowerCase());
          const p = normalizePhoneDigits(lead.phone);
          if (p.length >= 7) agentPhones.add(p);

          leadMap.set(lead.id, {
            id: lead.id,
            name: lead.name || lead.email || translateText('Lead'),
            email: lead.email || '',
            phone: lead.phone || '',
            stage: lead.stage || 'NEW',
            value: Number(lead.value || 0),
            assignedAt:
              linkedAssign?.assignedAt ||
              lead.handoffTimestamp ||
              lead.lastActivity ||
              lead.createdAt ||
              '',
          });
        }
      }

      // Include assignments that don't yet have a hydrated CRM row
      for (const a of allAssignments) {
        if (!matcher.matchesAssignment(a)) continue;
        if (a.customerEmail) agentEmails.add(a.customerEmail.trim().toLowerCase());
        const p = normalizePhoneDigits(a.customerPhone);
        if (p.length >= 7) agentPhones.add(p);
        if (a.leadId) agentLeadIds.add(a.leadId);

        const syntheticId = a.leadId || a.unifiedKey;
        if (!leadMap.has(syntheticId) && (a.leadId || a.customerName || a.customerEmail)) {
          leadMap.set(syntheticId, {
            id: syntheticId,
            name: a.customerName || a.customerEmail || translateText('Assigned Contact'),
            email: a.customerEmail || '',
            phone: a.customerPhone || '',
            stage: a.stage || (a.takenOver ? 'HUMAN_HANDOFF' : 'CONTACTED'),
            value: 0,
            assignedAt: a.assignedAt || a.updatedAt,
          });
        }
      }

      // 2. Match Conversations
      const convMap = new Map<string, AttributedConversationItem>();
      for (const conv of mergedConversations) {
        const linkedAssign = findAssignmentForConv(conv);
        const isMine = linkedAssign
          ? matcher.matchesAssignment(linkedAssign)
          : matcher.matchesOwnerField(conv.assignee);

        if (isMine) {
          if (conv.email) agentEmails.add(conv.email.trim().toLowerCase());
          const p = normalizePhoneDigits(conv.phone);
          if (p.length >= 7) agentPhones.add(p);

          const rawStage = (linkedAssign?.stage || conv.stage || '').toLowerCase();
          const takenOver = linkedAssign?.takenOver ?? conv.takenOver;
          const status: 'handoff' | 'resolved' | 'active' =
            rawStage.includes('resolved') || rawStage.includes('closed') || rawStage.includes('won')
              ? 'resolved'
              : takenOver
              ? 'handoff'
              : 'active';

          convMap.set(conv.id, {
            id: conv.id,
            leadId: linkedAssign?.leadId,
            name: conv.name || conv.email || translateText('Visitor'),
            channel: conv.channel || 'webchat',
            preview: conv.preview || '',
            status,
            updatedAt: linkedAssign?.updatedAt || conv.time || '',
          });
        }
      }

      // Also include conversation assignments not currently in the 10s GosInbox window
      for (const a of allAssignments) {
        const primaryConvId = a.conversationIds?.[0];
        if (!primaryConvId || convMap.has(primaryConvId)) continue;
        if (!matcher.matchesAssignment(a)) continue;
        const rawStage = (a.stage || '').toLowerCase();
        const status: 'handoff' | 'resolved' | 'active' =
          a.status === 'resolved' || rawStage.includes('resolved') || rawStage.includes('closed')
            ? 'resolved'
            : a.takenOver
            ? 'handoff'
            : 'active';
        convMap.set(primaryConvId, {
          id: primaryConvId,
          leadId: a.leadId,
          name: a.customerName || a.customerEmail || translateText('Visitor'),
          channel: a.channel || 'webchat',
          preview: '',
          status,
          updatedAt: a.updatedAt || a.assignedAt,
        });
      }

      // 3. Attribute Sales & Revenue from commerce orders/requests + converted CRM leads
      const sales: AttributedSaleItem[] = [];
      const attributedEmailsWithOrders = new Set<string>();

      for (const item of paidCommerceItems) {
        const directAgentMatch =
          item.assignedTo && item.assignedTo.toLowerCase() === member.id.toLowerCase();
        const leadMatch = item.leadId && agentLeadIds.has(item.leadId);
        const emailMatch = item.email && agentEmails.has(item.email);
        const phoneMatch = item.phone.length >= 7 && agentPhones.has(item.phone);

        if (directAgentMatch || leadMatch || emailMatch || phoneMatch) {
          if (item.email) attributedEmailsWithOrders.add(item.email);
          const converted = convertAmount(item.rawAmount, item.currency, currency);
          sales.push({
            id: item.key,
            title: item.title,
            customerName: item.customerName,
            customerEmail: item.email,
            amountInWorkspaceCurrency: converted,
            rawAmount: item.rawAmount,
            sourceCurrency: item.currency,
            date: item.date,
            reference: item.reference,
          });
        }
      }

      // Include converted CRM deals (CUSTOMER / PAYMENT_COMPLETED) with value > 0 not already represented by an order
      for (const lead of crmLeads) {
        if (!agentLeadIds.has(lead.id)) continue;
        const isConverted = lead.stage === 'CUSTOMER' || lead.stage === 'PAYMENT_COMPLETED';
        const val = Number(lead.value || 0);
        const leadEmail = (lead.email || '').trim().toLowerCase();
        if (isConverted && val > 0 && (!leadEmail || !attributedEmailsWithOrders.has(leadEmail))) {
          const converted = convertAmount(val, 'USD', currency);
          sales.push({
            id: `crm-${lead.id}`,
            title: lead.company || translateText('Converted CRM Deal'),
            customerName: lead.name,
            customerEmail: lead.email,
            amountInWorkspaceCurrency: converted,
            rawAmount: val,
            sourceCurrency: 'USD',
            date: lead.lastActivity || lead.createdAt || '',
            reference: lead.id.slice(0, 8),
          });
        }
      }

      const conversations = Array.from(convMap.values());
      const resolvedConversationsCount = conversations.filter(c => c.status === 'resolved').length;
      const handoffConversationsCount = conversations.filter(c => c.status === 'handoff').length;
      const activeConversationsCount = conversations.length - resolvedConversationsCount;
      const totalRevenueWorkspaceCurrency = sales.reduce(
        (sum, s) => sum + s.amountInWorkspaceCurrency,
        0,
      );

      const allocWeight = Math.max(0, Number(member.leadAllocationPercent ?? 50));
      const effectiveSharePercent = isOwnerFallback
        ? onShiftTotalWeight === 0
          ? 100
          : 0
        : shiftInfo.onShift && onShiftTotalWeight > 0
        ? Math.round((Math.max(1, allocWeight) / onShiftTotalWeight) * 100)
        : 0;

      return {
        member,
        isOwnerFallback,
        onShift: isOwnerFallback ? onShiftTotalWeight === 0 : shiftInfo.onShift,
        shiftInfo,
        effectiveSharePercent,
        leads: Array.from(leadMap.values()),
        conversations,
        activeConversationsCount,
        resolvedConversationsCount,
        handoffConversationsCount,
        sales,
        totalRevenueWorkspaceCurrency,
      };
    };

    const supportStats = evaluatedSupport.map(item =>
      computeForMember(item.member, item.shiftInfo, false),
    );
    const ownerStats = computeForMember(
      ownerMember,
      evaluateAgentShift(ownerMember, nowTick),
      true,
    );

    return [...supportStats, ownerStats];
  }, [
    assignments,
    supportMembers,
    ownerMember,
    nowTick,
    crmLeads,
    mergedConversations,
    orders,
    transactions,
    currency,
    convertAmount,
  ]);

  const supportOnlyStats = useMemo(
    () => agentStatsList.filter(s => !s.isOwnerFallback),
    [agentStatsList],
  );
  const onShiftSupportCount = useMemo(
    () => supportOnlyStats.filter(s => s.onShift).length,
    [supportOnlyStats],
  );

  const totals = useMemo(() => {
    let assignedLeads = 0;
    let activeConvs = 0;
    let resolvedConvs = 0;
    let totalRevenue = 0;
    let totalSalesCount = 0;
    for (const s of agentStatsList) {
      assignedLeads += s.leads.length;
      activeConvs += s.activeConversationsCount;
      resolvedConvs += s.resolvedConversationsCount;
      totalRevenue += s.totalRevenueWorkspaceCurrency;
      totalSalesCount += s.sales.length;
    }
    return { assignedLeads, activeConvs, resolvedConvs, totalRevenue, totalSalesCount };
  }, [agentStatsList]);

  const visibleStats = useMemo(() => {
    return agentStatsList.filter(item => {
      if (shiftFilter === 'on' && !item.onShift) return false;
      if (shiftFilter === 'off' && item.onShift) return false;
      if (searchQuery.trim()) {
        return matchesLocalizedSearch(searchQuery, [
          item.member.name,
          item.member.email,
          item.member.role,
        ]);
      }
      return true;
    });
  }, [agentStatsList, shiftFilter, searchQuery]);

  const selectedAgentStats = useMemo(
    () => agentStatsList.find(item => item.member.id === selectedAgentId) ?? null,
    [agentStatsList, selectedAgentId],
  );

  // Prevent background scroll when the detail drawer is open
  useEffect(() => {
    if (!selectedAgentStats) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedAgentStats]);

  const workspaceClockLabel = useMemo(() => {
    const tz =
      supportMembers[0]?.shiftSchedule?.timezone || defaultWorkspaceTimezone();
    try {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(nowTick);
      return `${timeStr} (${tz})`;
    } catch {
      return nowTick.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }, [nowTick, supportMembers]);

  const handleSaveQuickShift = useCallback(async () => {
    if (!editMember) return;
    if (
      editMember.shiftSchedule?.enabled !== false &&
      (editMember.shiftSchedule?.days ?? ALL_SHIFT_DAYS).length === 0
    ) {
      setEditError(translateText('Select at least one working day for the shift schedule.'));
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const cleanPerms = [...new Set(editMember.permissions.filter(Boolean))];
      if (cleanPerms.some(p => p.startsWith('settings:')) && !cleanPerms.includes('settings')) {
        cleanPerms.push('settings');
      }
      const payload: Member = {
        ...editMember,
        permissions: cleanPerms,
        allowedModules: cleanPerms,
        tabPermissions: buildTabPermissionsMap(cleanPerms),
        leadAllocationPercent: Math.max(
          0,
          Math.min(100, Math.round(Number(editMember.leadAllocationPercent ?? 50))),
        ),
        shiftSchedule: editMember.shiftSchedule ?? defaultSupportShiftSchedule(),
        updatedAt: new Date().toISOString(),
      };

      if (settingsApiEnabled) {
        await settingsRequest(`/team/${encodeURIComponent(payload.id)}`, payload, 'PATCH');
      }

      const localTeam = readTeam();
      const updatedMembers = localTeam.members.some(m => m.id === payload.id)
        ? localTeam.members.map(m => (m.id === payload.id ? payload : m))
        : [...localTeam.members, payload];
      saveLocal('team', {
        ...localTeam,
        members: updatedMembers,
      });
      window.dispatchEvent(new Event('gos-settings-changed'));
      showToast.success(translateText('Support routing & shift schedule updated.'));
      setEditMember(null);
    } catch (err) {
      setEditError(friendlyError(err));
    } finally {
      setSavingEdit(false);
    }
  }, [editMember]);

  return (
    <div className="spt-panel">
      <div className="spt-header-row">
        <PanelHeading
          title={translateText('Support Team & Routing')}
          description={translateText(
            'Live shift availability, weighted lead routing across Inbox, AI Follow-up & CRM, and per-agent revenue attribution.',
          )}
        />
        <div className="spt-header-actions">
          <button
            type="button"
            className="st-secondary"
            onClick={() => navigate('/dashboard/settings/team')}
          >
            <Settings2 size={15} />
            {translateText('Team & Roles')}
          </button>
          {canManage && (
            <button
              type="button"
              className="st-primary"
              onClick={() => navigate('/dashboard/settings/team?addSupport=1')}
            >
              <Plus size={15} />
              {translateText('Add Support Agent')}
            </button>
          )}
        </div>
      </div>

      {/* Live Unified Routing Engine Status Banner */}
      <div className={`spt-routing-banner${onShiftSupportCount === 0 ? ' is-fallback' : ''}`}>
        <div className="spt-banner-main">
          <span className="spt-banner-orb">
            {onShiftSupportCount > 0 ? <Headset size={21} /> : <ShieldAlert size={21} />}
          </span>
          <div className="spt-banner-copy">
            <strong>
              {onShiftSupportCount > 0 ? (
                <>
                  {translateText('Weighted Support Routing Active')}
                  <Badge tone="green">
                    {localizeNode(onShiftSupportCount)}/{localizeNode(supportOnlyStats.length)}{' '}
                    {translateText('On Shift')}
                  </Badge>
                </>
              ) : (
                <>
                  {translateText('Owner Fallback Routing Active')}
                  <Badge tone="orange">{translateText('No Support Agent On Shift')}</Badge>
                </>
              )}
            </strong>
            <p>
              {onShiftSupportCount > 0
                ? translateText(
                    'New leads and "Take Over Conversation" handoffs are automatically routed to on-shift Support agents by allocation percentage.',
                  )
                : `${translateText(
                    'All Support agents are currently off-shift or inactive. Incoming leads and human handoffs automatically route to Workspace Owner:',
                  )} ${ownerMember.name}.`}
            </p>
          </div>
        </div>
        <div className="spt-banner-meta">
          <span className="spt-clock-chip" title={translateText('Workspace Live Time')}>
            <Clock size={14} style={{ color: '#7c3aed' }} />
            <span>{workspaceClockLabel}</span>
          </span>
        </div>
      </div>

      {/* 4 Top-Level Performance KPIs */}
      <div className="spt-kpi-grid">
        <div className="spt-kpi-card">
          <div className="spt-kpi-copy">
            <small>{translateText('On-Shift Agents')}</small>
            <strong>
              {localizeNode(onShiftSupportCount)} / {localizeNode(supportOnlyStats.length)}
            </strong>
            <span>
              {onShiftSupportCount > 0
                ? translateText('Ready for live handoffs')
                : translateText('Fallback: Workspace Owner')}
            </span>
          </div>
          <span className="spt-kpi-icon green">
            <UserCheck size={19} />
          </span>
        </div>

        <div className="spt-kpi-card">
          <div className="spt-kpi-copy">
            <small>{translateText('Assigned Leads')}</small>
            <strong>{localizeNode(totals.assignedLeads)}</strong>
            <span>{translateText('Synced across CRM, Inbox & AI')}</span>
          </div>
          <span className="spt-kpi-icon purple">
            <Users size={19} />
          </span>
        </div>

        <div className="spt-kpi-card">
          <div className="spt-kpi-copy">
            <small>{translateText('Active / Resolved Chats')}</small>
            <strong>
              {localizeNode(totals.activeConvs)} / {localizeNode(totals.resolvedConvs)}
            </strong>
            <span>{translateText('Active vs. resolved threads')}</span>
          </div>
          <span className="spt-kpi-icon blue">
            <MessageSquare size={19} />
          </span>
        </div>

        <div className="spt-kpi-card">
          <div className="spt-kpi-copy">
            <small>{translateText('Attributed Revenue')}</small>
            <strong>{formatPrice(totals.totalRevenue, currency)}</strong>
            <span>
              {localizeNode(totals.totalSalesCount)} {translateText('attributed sales')}
            </span>
          </div>
          <span className="spt-kpi-icon amber">
            <DollarSign size={19} />
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <Card
        title={translateText('Support Agents & Attribution Breakdown')}
        description={translateText(
          'Click any agent to inspect their assigned leads, active/resolved conversations, and attributed sales.',
        )}
      >
        <div className="spt-toolbar" style={{ marginBottom: 16 }}>
          <label className="st-search" style={{ minWidth: 240, flex: '1 1 240px', maxWidth: 360 }}>
            <Search size={15} />
            <input
              type="search"
              style={{ width: '100%' }}
              placeholder={translateText('Search agent by name or email…')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>

          <div className="spt-filter-pills" role="tablist">
            {(
              [
                { id: 'all', label: 'All Agents' },
                { id: 'on', label: 'On Shift' },
                { id: 'off', label: 'Off Shift' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={shiftFilter === tab.id}
                className={`spt-filter-pill${shiftFilter === tab.id ? ' is-active' : ''}`}
                onClick={() => setShiftFilter(tab.id)}
              >
                {translateText(tab.label)}
              </button>
            ))}
          </div>
        </div>

        {supportOnlyStats.length === 0 && (
          <div
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              padding: '22px 18px',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <Headset size={28} style={{ color: '#7c3aed', marginBottom: 8 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 14 }}>
              {translateText('No dedicated Support agents configured yet')}
            </h4>
            <p style={{ maxWidth: 460, margin: '0 auto 12px', fontSize: 12 }}>
              {translateText(
                'Add a team member with the Support role (or Support Only preset) to enable shift-based weighted routing. Until then, all leads and handoffs route safely to the Workspace Owner.',
              )}
            </p>
            {canManage && (
              <button
                type="button"
                className="st-primary"
                onClick={() => navigate('/dashboard/settings/team?addSupport=1')}
              >
                <Plus size={14} />
                {translateText('Add First Support Agent')}
              </button>
            )}
          </div>
        )}

        <div className="spt-agents-grid">
          {visibleStats.map(stat => {
            const { member, isOwnerFallback, onShift, shiftInfo } = stat;
            const initials = (member.name || member.email || 'S')
              .split(' ')
              .map(part => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const configuredPct = isOwnerFallback
              ? 100
              : Math.max(0, Math.min(100, Number(member.leadAllocationPercent ?? 50)));
            const shift = member.shiftSchedule ?? defaultSupportShiftSchedule();

            return (
              <article
                key={member.id}
                className={`spt-agent-card${isOwnerFallback ? ' is-owner-card' : ''}`}
              >
                <div className="spt-agent-top">
                  <div className="spt-agent-identity">
                    <span className="spt-agent-avatar">{initials}</span>
                    <div>
                      <h4>
                        <span>{member.name}</span>
                        {isOwnerFallback ? (
                          <Badge tone="purple">{translateText('Owner Fallback')}</Badge>
                        ) : (
                          <Badge tone={member.active !== false ? 'purple' : 'neutral'}>
                            {translateText(member.role || 'Support')}
                          </Badge>
                        )}
                      </h4>
                      <small>{member.email}</small>
                    </div>
                  </div>

                  <span className={`st-shift-pill ${onShift ? 'is-on' : 'is-off'}`}>
                    <span className="st-shift-dot" />
                    {isOwnerFallback
                      ? translateText(onShift ? 'Fallback Active' : 'Standby Fallback')
                      : translateText(onShift ? 'On Shift' : 'Off Shift')}
                  </span>
                </div>

                {/* Allocation & Shift Schedule Summary */}
                <div className="spt-allocation-box">
                  <div className="spt-allocation-row">
                    <span>
                      {isOwnerFallback
                        ? translateText('Fallback Routing Share (When 0 Support On Shift)')
                        : translateText('Configured Lead Allocation')}
                    </span>
                    <strong>
                      {localizeNode(configuredPct)}%
                      {!isOwnerFallback && onShift && (
                        <small style={{ fontWeight: 600, marginInlineStart: 5, color: '#059669' }}>
                          ({translateText('Live')}: {localizeNode(stat.effectiveSharePercent)}%)
                        </small>
                      )}
                    </strong>
                  </div>
                  <div className="spt-allocation-bar">
                    <span style={{ width: `${configuredPct}%` }} />
                  </div>

                  <div className="spt-shift-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} />
                      {isOwnerFallback
                        ? translateText('24/7 Automatic Fallback')
                        : shift.enabled === false
                        ? translateText('24/7 (Schedule disabled)')
                        : `${shift.startTime || '09:00'} – ${shift.endTime || '17:00'} (${shiftInfo.currentTime})`}
                    </span>

                    {!isOwnerFallback && shift.enabled !== false && (
                      <div className="spt-shift-days">
                        {(shift.days ?? ALL_SHIFT_DAYS).map(d => (
                          <span key={d} className="spt-day-chip">
                            {translateText(d)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Per-Agent Performance Counters */}
                <div className="spt-metrics-row">
                  <div className="spt-metric-cell">
                    <strong>{localizeNode(stat.leads.length)}</strong>
                    <small>{translateText('Assigned Leads')}</small>
                  </div>
                  <div className="spt-metric-cell">
                    <strong>
                      {localizeNode(stat.activeConversationsCount)} /{' '}
                      {localizeNode(stat.resolvedConversationsCount)}
                    </strong>
                    <small>{translateText('Active / Resolved')}</small>
                  </div>
                  <div className="spt-metric-cell">
                    <strong>{formatPrice(stat.totalRevenueWorkspaceCurrency, currency)}</strong>
                    <small>
                      {localizeNode(stat.sales.length)} {translateText('Sales')}
                    </small>
                  </div>
                </div>

                <div className="spt-agent-actions">
                  <button
                    type="button"
                    className="st-secondary small"
                    onClick={() => {
                      setSelectedAgentId(member.id);
                      setDrawerTab('leads');
                    }}
                  >
                    <Eye size={13} />
                    {translateText('View Attribution & Leads')}
                  </button>

                  {!isOwnerFallback && canManage && (
                    <button
                      type="button"
                      className="st-soft-button"
                      style={{ minHeight: 28, padding: '5px 10px', fontSize: 11 }}
                      onClick={() => {
                        setEditError('');
                        setEditMember({
                          ...member,
                          leadAllocationPercent: member.leadAllocationPercent ?? 50,
                          shiftSchedule: member.shiftSchedule ?? defaultSupportShiftSchedule(),
                        });
                      }}
                    >
                      <Pencil size={12} />
                      {translateText('Edit Shift & %')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      {/* Quick Edit Shift & Allocation Modal */}
      {editMember && (() => {
        const shift = editMember.shiftSchedule ?? defaultSupportShiftSchedule();
        const allocation = Math.max(
          0,
          Math.min(100, Math.round(Number(editMember.leadAllocationPercent ?? 50))),
        );
        const tzOptions = TIMEZONE_SELECT_OPTIONS.some(o => o.value === shift.timezone)
          ? TIMEZONE_SELECT_OPTIONS
          : [{ value: shift.timezone || defaultWorkspaceTimezone(), label: shift.timezone || defaultWorkspaceTimezone() }, ...TIMEZONE_SELECT_OPTIONS];

        const updateShift = (patch: Partial<SupportShiftSchedule>) => {
          setEditMember({
            ...editMember,
            shiftSchedule: { ...shift, ...patch },
          });
        };

        const toggleDay = (day: DayCode) => {
          const set = new Set<DayCode>(shift.days ?? ALL_SHIFT_DAYS);
          if (set.has(day)) set.delete(day);
          else set.add(day);
          updateShift({ days: ALL_SHIFT_DAYS.filter(d => set.has(d)) });
        };

        return (
          <Modal
            title={`${translateText('Configure Shift & Allocation')} · ${editMember.name}`}
            close={() => setEditMember(null)}
          >
            <div className="st-support-config-box">
              <div className="st-support-block">
                <div className="st-support-block-top">
                  <span className="st-support-label">
                    <Percent size={13} />
                    {translateText('Lead Allocation Percentage')}
                  </span>
                  <div className="st-support-quick-pills">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        className={`st-support-mini-pill${allocation === pct ? ' is-active' : ''}`}
                        onClick={() =>
                          setEditMember({ ...editMember, leadAllocationPercent: pct })
                        }
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="st-support-slider-row">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={allocation}
                    onChange={e =>
                      setEditMember({
                        ...editMember,
                        leadAllocationPercent: Number(e.target.value) || 0,
                      })
                    }
                    className="st-support-range"
                  />
                  <div className="st-support-number-wrap">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={allocation}
                      onChange={e =>
                        setEditMember({
                          ...editMember,
                          leadAllocationPercent: Math.max(
                            0,
                            Math.min(100, Math.round(Number(e.target.value) || 0)),
                          ),
                        })
                      }
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              <div className="st-support-block">
                <div className="st-support-block-top">
                  <span className="st-support-label">
                    <Clock size={13} />
                    {translateText('Shift Schedule')}
                  </span>
                  <Toggle
                    label={translateText('Enable shift schedule')}
                    checked={shift.enabled !== false}
                    onChange={enabled => updateShift({ enabled })}
                  />
                </div>

                {shift.enabled !== false && (
                  <>
                    <div className="st-support-days-grid">
                      {ALL_SHIFT_DAYS.map(day => {
                        const activeDay = (shift.days ?? ALL_SHIFT_DAYS).includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`st-support-day-btn${activeDay ? ' is-active' : ''}`}
                            onClick={() => toggleDay(day)}
                          >
                            {translateText(day)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="st-support-time-grid">
                      <Field label={translateText('Shift Start Time')}>
                        <input
                          type="time"
                          value={shift.startTime || '09:00'}
                          onChange={e => updateShift({ startTime: e.target.value || '09:00' })}
                        />
                      </Field>
                      <Field label={translateText('Shift End Time')}>
                        <input
                          type="time"
                          value={shift.endTime || '17:00'}
                          onChange={e => updateShift({ endTime: e.target.value || '17:00' })}
                        />
                      </Field>
                      <Field label={translateText('Workspace Timezone')} className="st-support-tz-field">
                        <Select
                          value={shift.timezone || defaultWorkspaceTimezone()}
                          onChange={timezone => updateShift({ timezone })}
                          options={tzOptions}
                        />
                      </Field>
                    </div>
                  </>
                )}
              </div>
            </div>

            {editError && (
              <p className="st-error" role="alert">
                {localizeNode(editError)}
              </p>
            )}

            <div className="st-modal-actions">
              <button
                type="button"
                className="st-secondary"
                disabled={savingEdit}
                onClick={() => setEditMember(null)}
              >
                {translateText('Cancel')}
              </button>
              <button
                type="button"
                className="st-primary"
                disabled={savingEdit}
                onClick={() => void handleSaveQuickShift()}
              >
                {translateText(savingEdit ? 'Saving…' : 'Save Changes')}
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Per-Agent Drill-Down Drawer - Rendered via React Portal directly into document.body to avoid ancestor transform clipping */}
      {selectedAgentStats &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="spt-drawer-scrim"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedAgentId(null)}
          >
            <aside className="spt-drawer" onClick={e => e.stopPropagation()}>
              <div className="spt-drawer-head">
                <div className="spt-agent-identity">
                  <span className="spt-agent-avatar">
                    {(selectedAgentStats.member.name || 'S')
                      .split(' ')
                      .map(w => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>
                  <div>
                    <h4>
                      <span>{selectedAgentStats.member.name}</span>
                      <span
                        className={`st-shift-pill ${selectedAgentStats.onShift ? 'is-on' : 'is-off'}`}
                      >
                        <span className="st-shift-dot" />
                        {translateText(selectedAgentStats.onShift ? 'On Shift' : 'Off Shift')}
                      </span>
                    </h4>
                    <small>{selectedAgentStats.member.email}</small>
                  </div>
                </div>

                <button
                  type="button"
                  className="st-icon-button"
                  aria-label={translateText('Close')}
                  onClick={() => setSelectedAgentId(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="spt-drawer-summary">
                <div className="spt-metric-cell">
                  <strong>{localizeNode(selectedAgentStats.leads.length)}</strong>
                  <small>{translateText('Assigned Leads')}</small>
                </div>
                <div className="spt-metric-cell">
                  <strong>
                    {localizeNode(selectedAgentStats.activeConversationsCount)} /{' '}
                    {localizeNode(selectedAgentStats.resolvedConversationsCount)}
                  </strong>
                  <small>{translateText('Active / Resolved')}</small>
                </div>
                <div className="spt-metric-cell">
                  <strong>
                    {formatPrice(selectedAgentStats.totalRevenueWorkspaceCurrency, currency)}
                  </strong>
                  <small>{translateText('Attributed Revenue')}</small>
                </div>
              </div>

              <div className="spt-drawer-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === 'leads'}
                  className={`spt-drawer-tab${drawerTab === 'leads' ? ' is-active' : ''}`}
                  onClick={() => setDrawerTab('leads')}
                >
                  {translateText('Assigned Leads')} ({localizeNode(selectedAgentStats.leads.length)})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === 'conversations'}
                  className={`spt-drawer-tab${drawerTab === 'conversations' ? ' is-active' : ''}`}
                  onClick={() => setDrawerTab('conversations')}
                >
                  {translateText('Conversations')} (
                  {localizeNode(selectedAgentStats.conversations.length)})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === 'sales'}
                  className={`spt-drawer-tab${drawerTab === 'sales' ? ' is-active' : ''}`}
                  onClick={() => setDrawerTab('sales')}
                >
                  {translateText('Attributed Sales')} ({localizeNode(selectedAgentStats.sales.length)})
                </button>
              </div>

              <div className="spt-drawer-body">
                {drawerTab === 'leads' &&
                  (selectedAgentStats.leads.length === 0 ? (
                    <p className="st-note">
                      {translateText('No leads are currently assigned to this agent.')}
                    </p>
                  ) : (
                    selectedAgentStats.leads.map(lead => (
                      <div key={lead.id} className="spt-drill-row">
                        <div>
                          <strong>{lead.name}</strong>
                          <small>
                            {[lead.email, lead.phone].filter(Boolean).join(' · ') ||
                              translateText('Contact')}
                          </small>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Badge tone="purple">{translateText(lead.stage)}</Badge>
                          <button
                            type="button"
                            className="st-secondary small"
                            onClick={() => {
                              setSelectedAgentId(null);
                              navigate(`/dashboard/crm?leadId=${encodeURIComponent(lead.id)}`);
                            }}
                          >
                            {translateText('Open in CRM')}
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  ))}

                {drawerTab === 'conversations' &&
                  (selectedAgentStats.conversations.length === 0 ? (
                    <p className="st-note">
                      {translateText('No conversations are currently assigned to this agent.')}
                    </p>
                  ) : (
                    selectedAgentStats.conversations.map(conv => (
                      <div key={conv.id} className="spt-drill-row">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong>
                            {conv.name}{' '}
                            <small style={{ display: 'inline', fontWeight: 500 }}>
                              · {conv.channel}
                            </small>
                          </strong>
                          <small>
                            {conv.preview || translateText('Live support conversation')}
                          </small>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Badge
                            tone={
                              conv.status === 'resolved'
                                ? 'green'
                                : conv.status === 'handoff'
                                ? 'orange'
                                : 'purple'
                            }
                          >
                            {translateText(
                              conv.status === 'resolved'
                                ? 'Resolved'
                                : conv.status === 'handoff'
                                ? 'Human Handoff'
                                : 'Active',
                            )}
                          </Badge>
                          <button
                            type="button"
                            className="st-secondary small"
                            onClick={() => {
                              setSelectedAgentId(null);
                              navigate(
                                `/dashboard/inbox?conversationId=${encodeURIComponent(conv.id)}`,
                              );
                            }}
                          >
                            {translateText('Open Chat')}
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  ))}

                {drawerTab === 'sales' &&
                  (selectedAgentStats.sales.length === 0 ? (
                    <p className="st-note">
                      {translateText('No paid orders or converted sales attributed yet.')}
                    </p>
                  ) : (
                    selectedAgentStats.sales.map(sale => (
                      <div key={sale.id} className="spt-drill-row">
                        <div>
                          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                            {sale.title}
                          </strong>
                          <small>
                            {[sale.customerName, sale.customerEmail, sale.reference ? `#${sale.reference}` : '']
                              .filter(Boolean)
                              .join(' · ')}
                          </small>
                        </div>
                        <div style={{ textAlign: 'end' }}>
                          <strong style={{ color: '#059669', fontSize: 14 }}>
                            {formatPrice(sale.amountInWorkspaceCurrency, currency)}
                          </strong>
                          {sale.date && (
                            <small>
                              {new Date(sale.date).toString() !== 'Invalid Date'
                                ? new Date(sale.date).toLocaleDateString('en-US')
                                : sale.date}
                            </small>
                          )}
                        </div>
                      </div>
                    ))
                  ))}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
