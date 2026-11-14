import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function transpileModule(relPath, mocks = {}) {
  const source = fs.readFileSync(new URL(relPath, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const moduleObj = { exports };
  vm.runInNewContext(code, {
    exports,
    module: moduleObj,
    require: id => {
      if (id in mocks) return mocks[id];
      return require(id);
    },
    Date,
    Intl,
    Math,
    Number,
    String,
    Set,
    Map,
    Array,
    Object,
    Promise,
    console,
  });
  return moduleObj.exports;
}

const localState = transpileModule('../src/pages/settings/localState.ts', {
  '../../backend/workspace': { cloudStorage: {} },
  '../../store': { store: { getState: () => ({ auth: {} }) } },
  './data': { settingsKey: s => s },
});

const routing = transpileModule('../src/backend/supportRouting.ts', {
  react: { useCallback: fn => fn, useEffect: () => {}, useMemo: fn => fn(), useState: v => [v, () => {}] },
  'firebase/firestore': { collection: () => {}, doc: () => {}, getDoc: async () => ({ exists: () => false }), onSnapshot: () => () => {}, setDoc: async () => {} },
  'react-redux': { useSelector: () => undefined },
  './firebase': { db: {} },
  './workspace': { useEntities: () => [] },
  '../store': { store: { getState: () => ({ crm: { leads: [] } }), dispatch: () => {} } },
  '../store/slices/crmSlice': { setLeadFollowUpState: x => x, updateLead: x => x },
  '../pages/settings/localState': localState,
  './notifications': { pushWorkspaceNotification: async () => {} },
});

test('evaluateAgentShift accurately evaluates working days, shift hours, overnight shifts, and inactive state', () => {
  // Monday 11:30 UTC
  const monMorningUtc = new Date('2026-11-16T11:30:00Z');
  const agent = {
    id: 'sup-1',
    name: 'Ahmed Elsherif',
    email: 'asherif@gmail.com',
    role: 'Support',
    active: true,
    permissions: ['inbox', 'crm'],
    leadAllocationPercent: 70,
    shiftSchedule: {
      enabled: true,
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
    },
  };

  assert.equal(routing.evaluateAgentShift(agent, monMorningUtc).onShift, true);

  // Monday 20:30 UTC -> off-shift
  const monNightUtc = new Date('2026-11-16T20:30:00Z');
  assert.equal(routing.evaluateAgentShift(agent, monNightUtc).onShift, false);

  // Friday 11:30 UTC -> off-shift (Fri not in days)
  const friMorningUtc = new Date('2026-11-20T11:30:00Z');
  assert.equal(routing.evaluateAgentShift(agent, friMorningUtc).onShift, false);

  // Inactive agent -> always off-shift even during shift hours
  assert.equal(routing.evaluateAgentShift({ ...agent, active: false }, monMorningUtc).onShift, false);

  // Overnight shift (22:00 -> 06:00)
  const nightAgent = {
    ...agent,
    shiftSchedule: {
      enabled: true,
      days: ['Mon'],
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'UTC',
    },
  };
  assert.equal(routing.evaluateAgentShift(nightAgent, new Date('2026-11-16T23:15:00Z')).onShift, true);
  assert.equal(routing.evaluateAgentShift(nightAgent, new Date('2026-11-17T04:30:00Z')).onShift, true);
  assert.equal(routing.evaluateAgentShift(nightAgent, new Date('2026-11-17T12:00:00Z')).onShift, false);
});

test('selectSupportAssignee routes by weighted allocation % among on-shift agents and falls back to Owner when none on-shift', () => {
  const ownerFallback = { id: 'owner-1', name: 'mahmoud ali', email: 'ma@gmail.com' };
  const monMorningUtc = new Date('2026-11-16T11:30:00Z');
  const satMorningUtc = new Date('2026-11-21T11:30:00Z');

  const members = [
    {
      id: 'owner-1',
      name: 'mahmoud ali',
      email: 'ma@gmail.com',
      role: 'Owner',
      isOwner: true,
      active: true,
      permissions: ['*'],
    },
    {
      id: 'sup-75',
      authUid: 'uid-sup-75',
      name: 'Ahmed Elsherif',
      email: 'asherif@gmail.com',
      role: 'Support',
      active: true,
      permissions: ['inbox', 'crm', 'follow-up'],
      leadAllocationPercent: 75,
      shiftSchedule: {
        enabled: true,
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
      },
    },
    {
      id: 'sup-25',
      authUid: 'uid-sup-25',
      name: 'Sara Nabil',
      email: 'sara@gmail.com',
      role: 'Manager',
      preset: 'support',
      active: true,
      permissions: ['inbox', 'crm', 'follow-up'],
      leadAllocationPercent: 25,
      shiftSchedule: {
        enabled: true,
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
      },
    },
  ];

  // Simulate 4 sequential incoming leads during shift hours:
  // 75% vs 25% should allocate 3 leads to Ahmed (75%) and 1 lead to Sara (25%), starting with highest-% agent first!
  const existingAssignments = [];
  const picks = [];
  for (let i = 0; i < 4; i++) {
    const route = routing.selectSupportAssignee({
      members,
      existingAssignments,
      ownerFallback,
      now: monMorningUtc,
    });
    picks.push(route);
    existingAssignments.push({
      id: `a-${i}`,
      unifiedKey: `lead_${i}`,
      assignedTo: route.agentId,
      assignedAgentName: route.agentName,
      assignedAgentEmail: route.agentEmail,
      status: 'open',
    });
  }

  assert.equal(picks[0].agentId, 'uid-sup-75', 'First lead goes to highest allocation % agent');
  assert.equal(picks.filter(p => p.agentId === 'uid-sup-75').length, 3, '75% agent receives 3 of 4 leads');
  assert.equal(picks.filter(p => p.agentId === 'uid-sup-25').length, 1, '25% agent receives 1 of 4 leads');
  assert.ok(picks.every(p => p.reason === 'shift_weighted'));

  // Off-shift day (Saturday): both Support agents are off-shift -> automatic fallback to Workspace Owner!
  const fallbackPick = routing.selectSupportAssignee({
    members,
    existingAssignments,
    ownerFallback,
    now: satMorningUtc,
  });
  assert.equal(fallbackPick.agentId, 'owner-1');
  assert.equal(fallbackPick.agentName, 'mahmoud ali');
  assert.equal(fallbackPick.reason, 'owner_fallback');
});

test('computeUnifiedKey and findUnifiedAssignment maintain Single Source of Truth across CRM, Inbox & AI Follow-up', () => {
  const leads = [
    { id: 'lead-101', name: 'Fady Reda', email: 'fady10@gmail.com', phone: '+201012345678' },
  ];
  // Conversation arriving with same email resolves to the exact same canonical lead key!
  const keyFromConv = routing.computeUnifiedKey(
    { conversationId: 'conv-web-99', email: 'FADY10@gmail.com' },
    leads,
  );
  const keyFromLead = routing.computeUnifiedKey({ leadId: 'lead-101' }, leads);
  assert.equal(keyFromConv, keyFromLead);
  assert.equal(keyFromLead, 'lead_lead-101');

  const records = [
    {
      id: keyFromLead,
      unifiedKey: keyFromLead,
      leadId: 'lead-101',
      conversationIds: ['conv-web-99'],
      customerName: 'Fady Reda',
      customerEmail: 'fady10@gmail.com',
      customerPhone: '+201012345678',
      assignedTo: 'uid-sup-75',
      assignedAgentName: 'Ahmed Elsherif',
      status: 'open',
    },
  ];

  // Lookup by leadId, conversationId, email, or phone all return the single unified record!
  assert.equal(routing.findUnifiedAssignment(records, { leadId: 'lead-101' })?.assignedAgentName, 'Ahmed Elsherif');
  assert.equal(routing.findUnifiedAssignment(records, { conversationId: 'conv-web-99' })?.assignedAgentName, 'Ahmed Elsherif');
  assert.equal(routing.findUnifiedAssignment(records, { email: 'fady10@gmail.com' })?.assignedAgentName, 'Ahmed Elsherif');
  assert.equal(routing.findUnifiedAssignment(records, { phone: '01012345678' })?.assignedAgentName, 'Ahmed Elsherif');
});
