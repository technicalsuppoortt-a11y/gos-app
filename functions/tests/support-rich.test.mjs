import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldValue } from 'firebase-admin/firestore';
import { supportRequest, supportRoomId, validateSupportFiles } from '../support.js';

function fixture() {
  const rows = new Map(), writes = [], copies = [];
  const profiles = [{ uid: 's', role: 'SUPER_ADMIN' }, { uid: 'a', role: 'ADMIN', supportParentId: 's', tenantId: 'workspace-a' }, { uid: 'b', role: 'ADMIN', supportParentId: 's', tenantId: 'workspace-b' }, { uid: 'u', role: 'USER', supportParentId: 'a' }, { uid: 'v', role: 'USER', supportParentId: 'a' }, { uid: 'other', role: 'USER', supportParentId: 'b' }].map(p => ({ ...p, name: p.uid.toUpperCase(), status: 'Active' }));
  for (const p of profiles) rows.set(`users/${p.uid}`, p);
  const snapshot = path => ({ id: path.split('/').at(-1), exists: rows.has(path), data: () => rows.get(path) });
  const reference = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), collection: key => collection(`${path}/${key}`), set: async value => rows.set(path, { ...rows.get(path), ...value }) });
  const collection = (path, filters = [], cap = Infinity) => ({ doc: id => reference(`${path}/${id ?? 'audit'}`), where: (key, _, value) => collection(path, [...filters, [key, value]], cap), limit: n => collection(path, filters, n), get: async () => ({ docs: [...rows].filter(([key, value]) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1 && filters.every(([k, v]) => value[k] === v)).slice(0, cap).map(([key]) => snapshot(key)) }) });
  const db = { doc: reference, collection, runTransaction: async fn => {
    let mutated = false;
    const apply = (ref, value, kind) => { mutated = true; writes.push({ path: ref.path, value, kind }); rows.set(ref.path, { ...(kind === 'create' ? {} : rows.get(ref.path)), ...Object.fromEntries(Object.entries(value).filter(([, value]) => typeof value?.isEqual !== 'function')) }); };
    return fn({ get: async ref => { assert.equal(mutated, false, 'Firestore transactions must read before writing'); return snapshot(ref.path); }, create: (ref, value) => { assert.equal(rows.has(ref.path), false); apply(ref, value, 'create'); }, update: (ref, value) => { assert.equal(rows.has(ref.path), true); apply(ref, value, 'update'); }, set: (ref, value) => apply(ref, value, 'set') });
  } };
  const call = (uid, data) => supportRequest({ data }, { db, actor: async () => rows.get(`users/${uid}`), copyAttachment: async (...args) => copies.push(args) });
  return { rows, writes, copies, call };
}

test('eligible unmessaged contacts and same-workspace users can start a chat without exposing other teams', async () => {
  const f = fixture();
  f.rows.set('users/new-user', { uid: 'new-user', name: 'New user', status: 'Active', role: 'USER', tenantId: 'workspace-a' });
  const { contacts } = await f.call('a', { operation: 'contacts' });
  assert.deepEqual(contacts.map(c => c.id).sort(), ['new-user', 's', 'u', 'v']);
  const opened = await f.call('a', { operation: 'open', recipientId: 'new-user' });
  assert.deepEqual(f.rows.get(`supportRooms/${opened.roomId}`).participants, ['a', 'new-user']);
  await assert.rejects(f.call('a', { operation: 'open', recipientId: 'other' }), { code: 'permission-denied' });
});

test('workspace admins can start unassigned user chats but cannot override an explicit assignment', async () => {
  const f = fixture();
  f.rows.get('users/b').tenantId = 'workspace-a';
  f.rows.set('users/new-user', { uid: 'new-user', role: 'USER', status: 'Active', tenantId: 'workspace-a' });
  const { contacts } = await f.call('b', { operation: 'contacts' });
  assert.ok(contacts.some(c => c.id === 'new-user'));
  assert.ok(!contacts.some(c => c.id === 'u'));
  await assert.rejects(f.call('b', { operation: 'open', recipientId: 'u' }), { code: 'permission-denied' });
});

test('text sends and replies are retry safe; edits and delete-for-everyone require authorship', async () => {
  const f = fixture(), roomId = (await f.call('u', { operation: 'open', recipientId: 'a' })).roomId;
  const send = { operation: 'send', recipientId: 'a', messageId: 'message-1', text: 'Original', files: [] };
  await f.call('u', send); await f.call('u', send);
  assert.equal(f.writes.filter(w => w.kind === 'create' && w.path.endsWith('/message-1')).length, 1);
  await f.call('a', { operation: 'send', recipientId: 'u', messageId: 'reply-1', text: 'Reply', replyToId: 'message-1' });
  assert.equal(f.rows.get(`supportRooms/${roomId}/messages/reply-1`).replyContext.text, 'Original');
  await assert.rejects(f.call('a', { operation: 'edit', recipientId: 'u', messageId: 'message-1', text: 'Forged' }), { code: 'permission-denied' });
  await assert.rejects(f.call('a', { operation: 'delete', recipientId: 'u', messageId: 'message-1', scope: 'everyone' }), { code: 'permission-denied' });
  await f.call('u', { operation: 'edit', recipientId: 'a', messageId: 'message-1', text: 'Edited' });
  assert.equal(f.rows.get(`supportRooms/${roomId}/messages/message-1`).text, 'Edited');
  await f.call('u', { operation: 'delete', recipientId: 'a', messageId: 'message-1', scope: 'everyone' });
  assert.equal(f.rows.get(`supportRooms/${roomId}/messages/message-1`).deleted, true);
  assert.deepEqual(f.rows.get(`supportRooms/${roomId}/messages/message-1`).files, []);
});

test('reactions toggle per participant and delete-for-me persists only the caller UID', async () => {
  const f = fixture(); await f.call('u', { operation: 'open', recipientId: 'a' });
  await f.call('u', { operation: 'send', recipientId: 'a', messageId: 'message', text: 'Hello' });
  const path = `supportRooms/${supportRoomId('a', 'u')}/messages/message`;
  await f.call('a', { operation: 'react', recipientId: 'u', messageId: 'message', emoji: '👍' });
  assert.equal(f.rows.get(path).reactions.a, '👍');
  await f.call('a', { operation: 'react', recipientId: 'u', messageId: 'message', emoji: '👍' });
  assert.deepEqual(f.rows.get(path).reactions, {});
  await assert.rejects(f.call('a', { operation: 'react', recipientId: 'u', messageId: 'message', emoji: 'unsupported' }), { code: 'invalid-argument' });
  await f.call('a', { operation: 'delete', recipientId: 'u', messageId: 'message', scope: 'me' });
  const hidden = f.writes.findLast(w => w.path === path).value.hiddenFor;
  assert.ok(hidden.isEqual(FieldValue.arrayUnion('a')));
  assert.equal(f.rows.get(path).text, 'Hello');
});

test('forwarding copies files into an authorized destination and preserves audio metadata', async () => {
  const f = fixture(), sourceRoom = (await f.call('u', { operation: 'open', recipientId: 'a' })).roomId;
  const audio = { path: `supportAttachments/${sourceRoom}/u/voice`, name: 'voice.webm', size: 500, type: 'audio/webm', duration: 3.5, waveform: [.1, .8, .5] };
  await f.call('u', { operation: 'send', recipientId: 'a', messageId: 'voice', text: '', files: [audio] });
  const action = { operation: 'forward', recipientId: 'u', targetId: 'v', messageId: 'voice', forwardId: 'forwarded' };
  await f.call('a', action); await f.call('a', action);
  const forwarded = f.rows.get('supportRooms/a~v/messages/forwarded');
  assert.equal(forwarded.authorId, 'a'); assert.equal(forwarded.forwarded.authorName, 'U');
  assert.equal(forwarded.files[0].path, 'supportAttachments/a~v/a/forwarded-0');
  assert.equal(forwarded.files[0].duration, 3.5); assert.deepEqual(forwarded.files[0].waveform, [.1, .8, .5]);
  assert.equal(f.copies.length, 1, 'Retry does not create duplicate file copies');
  await assert.rejects(f.call('a', { ...action, targetId: 'other', forwardId: 'forbidden' }), { code: 'permission-denied' });
});

test('attachment validation rejects foreign paths and malformed rich metadata', () => {
  const file = { path: 'supportAttachments/a~u/u/file', name: 'audio.webm', type: 'audio/webm', size: 100, duration: 2, waveform: [.2, 1] };
  assert.equal(validateSupportFiles([file], 'a~u', 'u')[0].duration, 2);
  for (const invalid of [{ ...file, path: 'supportAttachments/foreign/u/file' }, { ...file, duration: NaN }, { ...file, waveform: [2] }]) assert.throws(() => validateSupportFiles([invalid], 'a~u', 'u'), { code: 'invalid-argument' });
});
