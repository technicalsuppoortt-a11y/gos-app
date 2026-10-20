import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

const validId = value => typeof value === 'string' && /^[\w-]{1,150}$/.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');
export function captureForms(document) {
  const forms = [];
  const visit = (items, page) => {
    for (const item of items ?? []) {
      if (['Form', 'Contact Form'].includes(item.type)) forms.push({ pageId: page.id, formId: item.id, step: page.name });
      for (const column of item.children ?? []) {
        let children = Array.isArray(column?.gosNestedArrayV1) ? column.gosNestedArrayV1 : column;
        if (typeof column?.gosNestedArrayV1 === 'string') { try { children = JSON.parse(column.gosNestedArrayV1); } catch { children = []; } }
        if (Array.isArray(children)) visit(children, page);
      }
    }
  };
  for (const page of document?.pages ?? []) visit(page.sections, page);
  return forms;
}

function text(value, max, field) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw new HttpsError('invalid-argument', `Check the ${field} field and try again.`);
  return value.trim();
}

/** Public callers use the capability embedded in the deployed site. Authenticated
 * previews are resolved through workspace membership, never a caller-supplied tenant. */
export async function captureAssetLeadRequest(request, { db, workspace, now = () => Date.now() }) {
  const input = request.data ?? {};
  const { assetId, pageId, formId, requestId } = input;
  if (![assetId, pageId, formId, requestId].every(validId)) throw new HttpsError('invalid-argument', 'Choose a valid page and form.');
  const name = text(input.name, 150, 'name'), email = text(input.email, 254, 'email').toLowerCase();
  const message = text(input.message, 5000, 'message'), phone = text(input.phone, 60, 'phone');
  if (!name && !email && !phone && !message) throw new HttpsError('invalid-argument', 'Enter your contact details before submitting.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  const preview = input.preview === true;
  let root, actorId = 'visitor';
  if (preview) { const scope = await workspace(request, 'funnels'); root = scope.root; actorId = scope.user.uid; }
  else {
    if (!validId(input.tenantId) || typeof input.captureToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.captureToken)) throw new HttpsError('permission-denied', 'This form is not available. Refresh the page and try again.');
    root = db.doc(`tenants/${input.tenantId}`);
  }
  const leadId = hash(`${assetId}/${requestId}`).slice(0, 32);
  const leadRef = root.collection('leads').doc(leadId), eventRef = root.collection('events').doc(`capture-${leadId}`);
  const stateRef = root.collection('hosting').doc(assetId), assetRef = root.collection('assets').doc(assetId);
  const rateRef = root.collection('captureLimits').doc(hash(`${assetId}/${request.rawRequest?.ip ?? actorId}`));
  const fingerprint = hash(JSON.stringify([pageId, formId, name, email, message, phone, preview]));
  return db.runTransaction(async tx => {
    const [state, asset, existing, limit] = await Promise.all([tx.get(stateRef), tx.get(assetRef), tx.get(leadRef), tx.get(rateRef)]);
    if (!asset.exists || asset.data().archived) throw new HttpsError('not-found', 'This form is no longer available.');
    if (!preview) {
      const expected = state.data()?.captureTokenHash, actual = hash(input.captureToken);
      if (typeof expected !== 'string' || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) throw new HttpsError('permission-denied', 'This form has changed. Refresh the page and try again.');
    }
    const allowed = preview ? captureForms(asset.data().document) : state.data()?.captureForms ?? [];
    const form = allowed.find(item => item.pageId === pageId && item.formId === formId);
    if (!form) throw new HttpsError('not-found', 'This form is no longer available.');
    if (existing.exists) {
      if (existing.data().captureFingerprint !== fingerprint) throw new HttpsError('already-exists', 'This submission has already been processed.');
      return { accepted: true, leadId };
    }
    const timestamp = now(), previous = limit.data();
    const recent = previous && timestamp - previous.windowStart < 60000;
    if (recent && previous.count >= 20) throw new HttpsError('resource-exhausted', 'Too many submissions. Please wait a minute and try again.');
    const createdAt = new Date(timestamp).toISOString(), source = asset.data().kind === 'funnel' ? 'Funnel' : 'Website';
    tx.set(rateRef, { windowStart: recent ? previous.windowStart : timestamp, count: recent ? previous.count + 1 : 1 });
    tx.set(leadRef, {
      id: leadId, sourceAssetId: assetId, sourcePageId: pageId, sourceFormId: formId,
      name: name || email || phone || 'Website visitor', email, message, phone, source, preview,
      stage: 'LEAD_CAPTURED', lifecycleStage: 'LEAD_CAPTURED', pipelineId: 'main',
      owner: 'Unassigned', company: '', value: 0, interest: message, avatar: (name || email || 'V').slice(0, 2).toUpperCase(), color: 'lilac',
      bookingStatus: 'Not Scheduled', qualificationStatus: 'Pending', followUpState: 'NEW',
      hasWhatsAppConsent: false, hasMessagingConsent: false, hasEmailConsent: false,
      tags: preview ? ['Preview'] : [], notes: message ? [message] : [],
      activities: [{ id: `capture-${leadId}`, type: 'capture', title: 'Form submitted', detail: `${asset.data().name} · ${form.step}`, at: createdAt }],
      createdAt, lastActivity: createdAt, captureFingerprint: fingerprint,
    });
    tx.set(eventRef, { id: eventRef.id, type: 'lead.captured', resource: 'assets', resourceId: assetId, sourceAssetId: assetId, leadId, pageId, formId, step: form.step, source, actorId, preview, device: ['desktop', 'tablet', 'mobile'].includes(input.device) ? input.device : 'desktop', createdAt });
    return { accepted: true, leadId };
  });
}
