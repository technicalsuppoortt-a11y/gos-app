import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { browserStorage } from '../utils/browserStorage';

export type WorkspaceNotificationCategory = 'Support' | 'Leads' | 'Bookings' | 'System';

export interface WorkspaceNotificationRecord {
  id: string;
  tenantId: string;
  type: 'lead.assigned' | 'conversation.handoff' | 'shift.updated' | 'shift.status' | 'system';
  category: WorkspaceNotificationCategory;
  recipientIds: string[];
  recipientEmails: string[];
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  deepLink: string;
  leadId?: string;
  conversationId?: string;
  agentId?: string;
  agentName?: string;
  readBy: string[];
  createdAt: string;
}

function localReadKey(scope: string, reader: string) {
  return `gos.support.notif.read.v1:${scope}:${reader}`;
}

function getLocalReadSet(scope: string, reader: string): Set<string> {
  if (!scope || !reader) return new Set();
  try {
    const raw = browserStorage.getItem(localReadKey(scope, reader));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveLocalReadSet(scope: string, reader: string, ids: Set<string>) {
  if (!scope || !reader) return;
  try {
    browserStorage.setItem(localReadKey(scope, reader), JSON.stringify([...ids].slice(-300)));
  } catch {
    /* ignore storage quota */
  }
}

export async function pushWorkspaceNotification(
  scope: string,
  input: Omit<WorkspaceNotificationRecord, 'id' | 'tenantId' | 'readBy' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  },
): Promise<string | null> {
  if (!scope) return null;
  const id =
    input.id && /^[\w:-]{1,140}$/.test(input.id)
      ? input.id.replace(/:/g, '_')
      : `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = input.createdAt || new Date().toISOString();
  const payload: WorkspaceNotificationRecord = {
    id,
    tenantId: scope,
    type: input.type,
    category: input.category,
    recipientIds: [...new Set((input.recipientIds || []).filter(Boolean))],
    recipientEmails: [
      ...new Set(
        (input.recipientEmails || [])
          .map(e => String(e || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    titleEn: input.titleEn,
    titleAr: input.titleAr,
    detailEn: input.detailEn,
    detailAr: input.detailAr,
    deepLink: input.deepLink || '/dashboard',
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.agentId ? { agentId: input.agentId } : {}),
    ...(input.agentName ? { agentName: input.agentName } : {}),
    readBy: [],
    createdAt,
  };
  try {
    await setDoc(doc(db, 'settings', `notifications_${scope}`, 'items', id), payload, { merge: true });
    return id;
  } catch {
    return null;
  }
}

export async function markWorkspaceNotificationRead(
  scope: string,
  notif: Pick<WorkspaceNotificationRecord, 'id' | 'readBy'>,
  readerId: string,
  readerEmail?: string,
): Promise<void> {
  if (!scope || !notif.id || !readerId) return;
  const cleanEmail = String(readerEmail || '').trim().toLowerCase();
  const localSet = getLocalReadSet(scope, readerId);
  localSet.add(notif.id);
  saveLocalReadSet(scope, readerId, localSet);

  const nextReadBy = [...new Set([...(notif.readBy || []), readerId, ...(cleanEmail ? [cleanEmail] : [])])];
  await setDoc(
    doc(db, 'settings', `notifications_${scope}`, 'items', notif.id),
    { readBy: nextReadBy },
    { merge: true },
  ).catch(() => null);
}

export async function markAllWorkspaceNotificationsRead(
  scope: string,
  items: Pick<WorkspaceNotificationRecord, 'id' | 'readBy'>[],
  readerId: string,
  readerEmail?: string,
): Promise<void> {
  if (!scope || !readerId || !items.length) return;
  const cleanEmail = String(readerEmail || '').trim().toLowerCase();
  const localSet = getLocalReadSet(scope, readerId);
  for (const item of items) localSet.add(item.id);
  saveLocalReadSet(scope, readerId, localSet);

  await Promise.all(
    items.slice(0, 60).map(item => {
      const already =
        item.readBy?.includes(readerId) || (cleanEmail ? item.readBy?.includes(cleanEmail) : false);
      if (already) return Promise.resolve();
      const nextReadBy = [...new Set([...(item.readBy || []), readerId, ...(cleanEmail ? [cleanEmail] : [])])];
      return setDoc(
        doc(db, 'settings', `notifications_${scope}`, 'items', item.id),
        { readBy: nextReadBy },
        { merge: true },
      ).catch(() => null);
    }),
  );
}

export function useWorkspaceNotifications(options: {
  scope?: string;
  userId?: string;
  userEmail?: string;
  isOwner?: boolean;
}) {
  const { scope = '', userId = '', userEmail = '', isOwner = false } = options;
  const cleanEmail = userEmail.trim().toLowerCase();
  const [rows, setRows] = useState<WorkspaceNotificationRecord[]>([]);
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    if (!scope) {
      setRows([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'settings', `notifications_${scope}`, 'items'),
      snap => {
        const list: WorkspaceNotificationRecord[] = [];
        for (const docSnap of snap.docs) {
          const d = docSnap.data() as Partial<WorkspaceNotificationRecord>;
          if (!d || (!d.titleEn && !d.titleAr)) continue;
          list.push({
            id: d.id || docSnap.id,
            tenantId: d.tenantId || scope,
            type: d.type || 'system',
            category: d.category || 'Support',
            recipientIds: Array.isArray(d.recipientIds) ? d.recipientIds : [],
            recipientEmails: Array.isArray(d.recipientEmails) ? d.recipientEmails : [],
            titleEn: String(d.titleEn || d.titleAr || ''),
            titleAr: String(d.titleAr || d.titleEn || ''),
            detailEn: String(d.detailEn || d.detailAr || ''),
            detailAr: String(d.detailAr || d.detailEn || ''),
            deepLink: String(d.deepLink || '/dashboard'),
            leadId: d.leadId,
            conversationId: d.conversationId,
            agentId: d.agentId,
            agentName: d.agentName,
            readBy: Array.isArray(d.readBy) ? d.readBy : [],
            createdAt: String(d.createdAt || new Date().toISOString()),
          });
        }
        list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        setRows(list.slice(0, 100));
      },
      () => setRows([]),
    );
    return unsub;
  }, [scope]);

  const visible = useMemo(() => {
    void localTick;
    const localSet = getLocalReadSet(scope, userId);
    return rows
      .filter(item => {
        if (!item.recipientIds.length && !item.recipientEmails.length) return true;
        if (item.recipientIds.includes('*')) return true;
        if (userId && item.recipientIds.includes(userId)) return true;
        if (cleanEmail && item.recipientEmails.includes(cleanEmail)) return true;
        if (isOwner && item.recipientIds.includes('owner')) return true;
        return false;
      })
      .map(item => ({
        ...item,
        isRead:
          localSet.has(item.id) ||
          (Boolean(userId) && item.readBy.includes(userId)) ||
          (Boolean(cleanEmail) && item.readBy.includes(cleanEmail)),
      }));
  }, [rows, scope, userId, cleanEmail, isOwner, localTick]);

  const markRead = async (notif: WorkspaceNotificationRecord) => {
    await markWorkspaceNotificationRead(scope, notif, userId, cleanEmail);
    setLocalTick(v => v + 1);
  };

  const markAllRead = async () => {
    await markAllWorkspaceNotificationsRead(scope, visible, userId, cleanEmail);
    setLocalTick(v => v + 1);
  };

  return { notifications: visible, markRead, markAllRead };
}
