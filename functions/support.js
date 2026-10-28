import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';

// Callable middleware answers OPTIONS before actor authorization runs. Public
// invocation is required for browser preflights; the handler still requires Auth.
export function createSupportCallable(dependencies) {
  return onCall({ cors: true, invoker: 'public' }, request => supportRequest(request, dependencies));
}

const managedUser = (user, admin) => user.supportParentId ? user.supportParentId === admin.uid : !!user.tenantId && user.tenantId === admin.tenantId;
export function mayChat(a, b) {
  return a.status === 'Active' && b.status === 'Active' && (a.role === 'USER' && b.role === 'ADMIN' && managedUser(a, b) || b.role === 'USER' && a.role === 'ADMIN' && managedUser(b, a) || a.role === 'ADMIN' && b.role === 'SUPER_ADMIN' && a.supportParentId === b.uid || b.role === 'ADMIN' && a.role === 'SUPER_ADMIN' && b.supportParentId === a.uid);
}
export const supportRoomId = (a, b) => [a, b].sort().map(id => encodeURIComponent(id).replaceAll('~', '%7E')).join('~');
const validId = id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);
const roomData = (a, b) => ({ participants: [a.uid, b.uid].sort(), names: { [a.uid]: a.name || a.email || 'Support', [b.uid]: b.name || b.email || 'Support' }, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastMessage: '' });
async function copySupportAttachment(source, destination) {
  const bucket = getStorage().bucket();
  await bucket.file(source).copy(bucket.file(destination));
  await bucket.file(destination).setMetadata({ metadata: { firebaseStorageDownloadTokens: randomUUID() } });
}
export function validateSupportFiles(files, roomId, uid) {
  if (!Array.isArray(files) || files.length > 3) throw new HttpsError('invalid-argument', 'Attach up to three files.');
  return files.map(f => {
    if (!f || typeof f.path !== 'string' || !f.path.startsWith(`supportAttachments/${roomId}/${uid}/`) || f.path.includes('..') || typeof f.name !== 'string' || f.name.length > 200 || typeof f.type !== 'string' || f.type.length > 150 || !Number.isFinite(f.size) || f.size <= 0 || f.size > 10485760) throw new HttpsError('invalid-argument', 'Invalid attachment.');
    if (f.duration !== undefined && (!Number.isFinite(f.duration) || f.duration < 0 || f.duration > 86400)) throw new HttpsError('invalid-argument', 'Invalid audio duration.');
    if (f.waveform !== undefined && (!Array.isArray(f.waveform) || f.waveform.length > 64 || f.waveform.some(n => !Number.isFinite(n) || n < 0 || n > 1))) throw new HttpsError('invalid-argument', 'Invalid audio waveform.');
    return { path: f.path, name: f.name, type: f.type, size: f.size, ...(f.duration !== undefined ? { duration: f.duration } : {}), ...(f.waveform ? { waveform: f.waveform } : {}) };
  });
}
export async function supportRequest(request, { actor, db, copyAttachment = copySupportAttachment }) {
  const user = await actor(request);
  const data = request.data ?? {};
  if (!['contacts', 'directory', 'assign', 'open', 'send', 'read', 'delete', 'edit', 'react', 'forward'].includes(data.operation)) throw new HttpsError('invalid-argument', 'Unknown support action.');
  if (data.operation === 'assign') {
    if (user.role !== 'SUPER_ADMIN') throw new HttpsError('permission-denied', 'Only the super administrator can assign support teams.');
    if (![data.userId, data.parentId].every(id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id))) throw new HttpsError('invalid-argument', 'Choose a user and support owner.');
    await db.runTransaction(async tx => {
      const targetRef = db.doc(`users/${data.userId}`);
      const target = (await tx.get(targetRef)).data();
      const parent = (await tx.get(db.doc(`users/${data.parentId}`))).data();
      if (!target || !parent || target.status !== 'Active' || parent.status !== 'Active' || !(target.role === 'USER' && parent.role === 'ADMIN' || target.role === 'ADMIN' && parent.role === 'SUPER_ADMIN')) throw new HttpsError('invalid-argument', 'Assign users to an active admin and admins to an active super admin.');
      tx.update(targetRef, { supportParentId: data.parentId });
      tx.create(db.collection('userManagementAudit').doc(), { actorId: user.uid, userId: data.userId, parentId: data.parentId, type: 'support.assigned', createdAt: FieldValue.serverTimestamp() });
    });
    return { ok: true };
  }
  if (data.operation === 'directory' && user.role !== 'SUPER_ADMIN') throw new HttpsError('permission-denied', 'Only super administrators can view support assignments.');
  let profiles;
  if (['contacts', 'directory'].includes(data.operation)) {
    const users = await db.collection('users').where('status', '==', 'Active').get();
    profiles = users.docs.map(d => ({ ...d.data(), uid: d.id }));
  } else {
    if (typeof data.recipientId !== 'string' || !/^[\w-]{1,128}$/.test(data.recipientId)) throw new HttpsError('invalid-argument', 'Invalid support recipient.');
    const peer = await db.doc(`users/${data.recipientId}`).get();
    profiles = [user, ...(peer.exists ? [{ ...peer.data(), uid: peer.id }] : [])];
    if (data.operation === 'forward' && data.targetId !== data.recipientId) {
      if (!validId(data.targetId)) throw new HttpsError('invalid-argument', 'Choose a forwarding recipient.');
      const target = await db.doc(`users/${data.targetId}`).get();
      if (target.exists) profiles.push({ ...target.data(), uid: target.id });
    }
  }
  if (data.operation === 'directory') return { users: profiles.map(p => ({ id: p.uid, name: p.name || p.email || p.uid, role: p.role, supportParentId: p.supportParentId ?? '' })) };
  // Older accounts inherit the administrator recorded in their creation audit.
  for (const p of profiles) {
    if (p.supportParentId || p.role === 'SUPER_ADMIN') continue;
    const parentRole = p.role === 'USER' ? 'ADMIN' : 'SUPER_ADMIN';
    const workspaceAdmins = p.role === 'USER' && p.tenantId ? profiles.filter(a => a.role === 'ADMIN' && a.status === 'Active' && a.tenantId === p.tenantId) : [];
    const audit = await db.collection('userManagementAudit').where('userId', '==', p.uid).where('type', '==', 'user.created').limit(1).get();
    const creatorId = audit.docs[0]?.data().actorId;
    const creator = creatorId ? (await db.doc(`users/${creatorId}`).get()).data() : null;
    if (creator?.role === parentRole && creator.status === 'Active') p.supportParentId = creatorId;
    else if (workspaceAdmins.length === 1) p.supportParentId = workspaceAdmins[0].uid;
    else {
      const candidates = await db.collection('users').where('role', '==', parentRole).where('status', '==', 'Active').limit(2).get();
      p.supportParentId = candidates.docs.length === 1 ? candidates.docs[0].id : '';
    }
  }
  const current = profiles.find(p => p.uid === user.uid);
  const contacts = profiles.filter(p => current && mayChat(current, p));
  if (data.operation === 'contacts') return { contacts: contacts.map(p => ({ id: p.uid, name: p.name || p.email || 'Support contact', role: p.role })) };
  const peer = contacts.find(p => p.uid === data.recipientId);
  if (!peer) throw new HttpsError('permission-denied', 'This account is outside your support team.');
  const roomId = supportRoomId(user.uid, peer.uid);
  const room = db.collection('supportRooms').doc(roomId);
  if (data.operation === 'open') {
    await db.runTransaction(async tx => {
      if (!(await tx.get(room)).exists) tx.create(room, roomData(user, peer));
    });
    return { roomId };
  }
  if (!(await room.get()).exists) throw new HttpsError('not-found', 'Open this conversation first.');
  if (data.operation === 'read') { await room.set({ readAt: { [user.uid]: FieldValue.serverTimestamp() } }, { merge: true }); return { ok: true }; }
  if (!/^[\w-]{1,100}$/.test(data.messageId ?? '')) throw new HttpsError('invalid-argument', 'Invalid message ID.');
  const message = room.collection('messages').doc(data.messageId);
  if (data.operation === 'forward') {
    const target = contacts.find(p => p.uid === data.targetId);
    if (!target || !validId(data.forwardId)) throw new HttpsError('permission-denied', 'Choose a recipient within your support team.');
    const targetRoom = db.collection('supportRooms').doc(supportRoomId(user.uid, target.uid));
    const targetMessage = targetRoom.collection('messages').doc(data.forwardId);
    if ((await targetMessage.get()).exists) return { roomId: targetRoom.id };
    const source = (await message.get()).data();
    if (!source || source.deleted || source.hiddenFor?.includes(user.uid)) throw new HttpsError('not-found', 'This message is unavailable.');
    const copied = [];
    for (const [index, file] of (source.files ?? []).entries()) {
      if (!file.path.startsWith(`supportAttachments/${roomId}/`)) throw new HttpsError('failed-precondition', 'The source attachment is unavailable.');
      const path = `supportAttachments/${targetRoom.id}/${user.uid}/${data.forwardId}-${index}`;
      await copyAttachment(file.path, path);
      copied.push({ ...file, path });
    }
    await db.runTransaction(async tx => {
      const [latest, targetSnapshot, existing] = await Promise.all([tx.get(message), tx.get(targetRoom), tx.get(targetMessage)]);
      if (existing.exists) return;
      const current = latest.data();
      if (!current || current.deleted || current.hiddenFor?.includes(user.uid) || current.text !== source.text || JSON.stringify(current.files ?? []) !== JSON.stringify(source.files ?? [])) throw new HttpsError('aborted', 'The message changed. Refresh before forwarding.');
      const lastMessage = source.text || 'Attachment';
      if (!targetSnapshot.exists) tx.create(targetRoom, { ...roomData(user, target), lastMessage, lastMessageId: targetMessage.id, lastAuthorId: user.uid });
      else tx.update(targetRoom, { lastMessage, lastMessageId: targetMessage.id, hiddenPreviewFor: [], lastAuthorId: user.uid, updatedAt: FieldValue.serverTimestamp() });
      tx.create(targetMessage, { authorId: user.uid, authorName: user.name || user.email || 'Support', text: source.text, files: copied, forwarded: { authorName: source.authorName }, createdAt: FieldValue.serverTimestamp(), deleted: false });
    });
    return { roomId: targetRoom.id };
  }
  if (['delete', 'edit', 'react'].includes(data.operation)) {
    await db.runTransaction(async tx => {
      const [old, roomSnapshot] = await Promise.all([tx.get(message), tx.get(room)]);
      const value = old.data();
      if (!value) throw new HttpsError('not-found', 'Message not found.');
      if (data.operation === 'delete' && data.scope === 'me') {
        tx.update(message, { hiddenFor: FieldValue.arrayUnion(user.uid) });
        if (roomSnapshot.data()?.lastMessageId === message.id) tx.update(room, { hiddenPreviewFor: FieldValue.arrayUnion(user.uid) });
        return;
      }
      if (value.deleted || value.hiddenFor?.includes(user.uid)) throw new HttpsError('failed-precondition', 'This message is unavailable.');
      if (data.operation === 'react') {
        if (!['👍', '❤️', '😂', '🎉', '🙏', '👀'].includes(data.emoji)) throw new HttpsError('invalid-argument', 'Choose a supported reaction.');
        const reactions = { ...(value.reactions ?? {}) };
        if (reactions[user.uid] === data.emoji) delete reactions[user.uid]; else reactions[user.uid] = data.emoji;
        tx.update(message, { reactions });
        return;
      }
      if (value.authorId !== user.uid) throw new HttpsError('permission-denied', 'Only the author can edit or delete this message for everyone.');
      if (data.operation === 'edit') {
        if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 5000) throw new HttpsError('invalid-argument', 'Enter a message of up to 5000 characters.');
        tx.update(message, { text: data.text.trim(), editedAt: FieldValue.serverTimestamp() });
        if (roomSnapshot.data()?.lastMessageId === message.id) tx.update(room, { lastMessage: data.text.trim() });
      } else {
        if (data.scope !== undefined && data.scope !== 'everyone') throw new HttpsError('invalid-argument', 'Choose delete for me or everyone.');
        tx.update(message, { text: '', files: [], reactions: {}, replyContext: null, deleted: true, deletedAt: FieldValue.serverTimestamp() });
        if (roomSnapshot.data()?.lastMessageId === message.id) tx.update(room, { lastMessage: 'Message deleted' });
      }
    });
    return { ok: true };
  }
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const files = validateSupportFiles(data.files ?? [], roomId, user.uid);
  if (text.length > 5000 || !Array.isArray(files) || files.length > 3 || (!text && !files.length)) throw new HttpsError('invalid-argument', 'Enter a message of up to 5000 characters or attach a file.');
  await db.runTransaction(async tx => {
    if ((await tx.get(message)).exists) return; // Retry-safe dispatch.
    let replyContext = null;
    if (data.replyToId && /^[\w-]{1,100}$/.test(data.replyToId)) {
      const original = await tx.get(room.collection('messages').doc(data.replyToId));
      if (original.exists && !original.data().deleted && !original.data().hiddenFor?.includes(user.uid)) replyContext = { id: original.id, text: original.data().text.slice(0, 200), authorName: original.data().authorName };
    }
    tx.create(message, { authorId: user.uid, authorName: user.name || user.email, text, files, replyContext, createdAt: FieldValue.serverTimestamp(), deleted: false });
    tx.update(room, { lastMessage: text || 'Attachment', lastMessageId: message.id, hiddenPreviewFor: [], updatedAt: FieldValue.serverTimestamp(), lastAuthorId: user.uid });
  });
  return { ok: true };
}
