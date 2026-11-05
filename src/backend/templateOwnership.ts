import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { primaryAuth, primaryDb, backendError } from './firebase';
import { decodeFirestoreValue, encodeFirestoreValue } from './firestoreCodec';
import type { RootState } from '../store';
import type { ManagedTemplate } from '../pages/admin/managed-template';
import { initializeTemplateAsset } from '../pages/system-template-assets';
import { validateSystemTemplate } from '../pages/system-template-validation';

/**
 * Template ownership:
 * - `templateCatalog`            super admin "My templates" = every admin's read-only "General templates".
 * - `adminTemplates/{id}`        an admin's own "My templates" (ownerUid), shown only to that admin's users;
 *                                the super admin sees all of them read-only as "Client templates".
 * - `adminTemplateSettings/{uid}` the general templates an admin hid from their own users.
 */
export type OwnedTemplate = ManagedTemplate & { ownerUid?: string; ownerName?: string; ownerEmail?: string };
export type TemplateLibraryScope = 'system' | 'general' | 'mine' | 'client';

const decode = (item: { id: string; data: () => Record<string, unknown> }) => ({ ...decodeFirestoreValue(item.data()), id: item.id }) as OwnedTemplate;

/** Live templates and the admin's hidden list for one admin/super-admin library tab. */
export function useTemplateLibrary(scope: TemplateLibraryScope | null) {
  const uid = useSelector((s: RootState) => s.auth.user?.id) || '';
  const [state, setState] = useState<{ key: string; templates: OwnedTemplate[]; hidden: string[]; loading: boolean; error: string }>({ key: '', templates: [], hidden: [], loading: true, error: '' });
  const key = `${scope}:${uid}`;
  useEffect(() => {
    setState({ key, templates: [], hidden: [], loading: true, error: '' });
    if (!uid || !scope) return;
    const fail = (cause: unknown) => setState(s => ({ ...s, loading: false, error: backendError(cause) }));
    const source = scope === 'mine' ? query(collection(primaryDb, 'adminTemplates'), where('ownerUid', '==', uid))
      : scope === 'client' ? collection(primaryDb, 'adminTemplates') : collection(primaryDb, 'templateCatalog');
    const stops = [onSnapshot(source, snapshot => setState(s => ({ ...s, key, templates: snapshot.docs.map(decode), loading: false, error: '' })), fail)];
    if (scope === 'general') stops.push(onSnapshot(doc(primaryDb, 'adminTemplateSettings', uid), snapshot => setState(s => ({ ...s, hidden: (snapshot.data()?.hiddenGeneral as string[] | undefined) ?? [] })), fail));
    return () => stops.forEach(stop => stop());
  }, [key]);
  return state.key === key ? state : { templates: [] as OwnedTemplate[], hidden: [] as string[], loading: true, error: '' };
}

function prepare(template: ManagedTemplate) {
  const value = initializeTemplateAsset(template);
  const errors = validateSystemTemplate(value);
  if (errors.length) throw new Error(errors.join(' '));
  if (!value.name.trim() || !value.content || !Array.isArray(value.content.steps)) throw new Error('Template name and valid content are required.');
  const active = value.active !== false && (!value.status || value.status === 'Published');
  return { ...encodeFirestoreValue(value), source: 'official', updated: new Date().toISOString(), active, status: active ? 'Published' : 'Draft', updatedAt: serverTimestamp(), updatedBy: primaryAuth.currentUser!.uid };
}

/** Saves a template into the signed-in admin's own library. */
export async function saveAdminTemplate(template: ManagedTemplate) {
  const account = primaryAuth.currentUser;
  if (!account) throw new Error('Sign in to manage templates.');
  const { ownerUid: _owner, ownerName: _name, ownerEmail: _email, ...rest } = template as OwnedTemplate;
  await setDoc(doc(primaryDb, 'adminTemplates', template.id), { ...prepare(rest), ownerUid: account.uid, ownerName: account.displayName || '', ownerEmail: account.email || '' });
}
export async function deleteAdminTemplate(id: string) { await deleteDoc(doc(primaryDb, 'adminTemplates', id)); }

/** Shows or hides one general template for the signed-in admin's users only. */
export async function setGeneralTemplateHidden(templateId: string, hidden: boolean) {
  const account = primaryAuth.currentUser;
  if (!account) throw new Error('Sign in to manage templates.');
  // Plain read-modify-write (the demo build's Firestore stand-in has no arrayUnion/arrayRemove).
  const target = doc(primaryDb, 'adminTemplateSettings', account.uid);
  const current = ((await getDoc(target)).data()?.hiddenGeneral as string[] | undefined) ?? [];
  const hiddenGeneral = hidden ? [...new Set([...current, templateId])] : current.filter(id => id !== templateId);
  await setDoc(target, { hiddenGeneral, updatedAt: serverTimestamp() }, { merge: true });
}

/** Copies a general template into the admin's library as an editable draft. */
export async function duplicateToMyTemplates(template: ManagedTemplate) {
  const { id: _id, ...copy } = structuredClone(template) as OwnedTemplate;
  delete copy.ownerUid; delete copy.ownerName; delete copy.ownerEmail;
  const id = crypto.randomUUID();
  await saveAdminTemplate({ ...copy, id, name: `${template.name} (copy)`.slice(0, 180), active: false, status: 'Draft', popularity: 0, pageTemplate: copy.pageTemplate ? { ...copy.pageTemplate, id } : undefined } as ManagedTemplate);
  return id;
}
