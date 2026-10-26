import { PolicyControls, SlotChips, CustomFieldsEditor, PageSelector } from './DynamicCheckoutControls';
import { useRef, useState } from 'react';
import { callBackend } from '../../backend/firebase';
import { useEntities } from '../../backend/workspace';
import { translateText } from '../../i18n/display';
import { CommerceSelect } from '../../components/ui/CommerceSelect';
import { Dialog, Field, Toggle } from './primitives';
import { productKind, type CommerceConfig, type ProductExperience } from './model';
import type { FormProps } from './TypeForms';

export function ProductAdvancedAction({ section, ...props }: FormProps & { section: 'settings' | 'checkout' | 'access' | 'automation' | 'booking' }) {
  const [open, setOpen] = useState(false), [config, setConfig] = useState(props.config), [experience, setExperience] = useState(props.experience);
  const [email, setEmail] = useState(''), [result, setResult] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const calendars = useEntities<Record<string, any>>('calendars');
  const kind = productKind(props.product.type);
  if (section === 'settings' && kind === 'digital') return null;
  const patch = (value: Partial<CommerceConfig>) => setConfig(current => ({ ...current, ...value }));
  const checkout = (value: Partial<ProductExperience['checkout']>) => setExperience(current => ({ ...current, checkout: { ...current.checkout, ...value } }));
  async function access(action: 'grant' | 'revoke' | 'certificate' | 'syncCalendar') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setResult('');
    try {
      const response = await callBackend<{ token?: string; tenantId?: string; certificate?: { id: string; course: string; name: string; issuedAt: string }; message?: string }>('commerceService', { action, productId: props.product.id, email });
      if (response.token) setResult(`${window.location.origin}/product-access?tenant=${encodeURIComponent(response.tenantId || '')}&token=${encodeURIComponent(response.token)}`);
      else if (response.certificate) {
        const certificate = response.certificate;
        const escape = (value: string) => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="1000" height="700" fill="white"/><rect x="30" y="30" width="940" height="640" fill="none" stroke="#7C3AED" stroke-width="4"/><g text-anchor="middle" font-family="serif" fill="#0f172a"><text x="500" y="180" font-size="40">Certificate of Completion</text><text x="500" y="300" font-size="36">${escape(certificate.name)}</text><text x="500" y="390" font-size="26">${escape(certificate.course)}</text><text x="500" y="520" font-size="16">${escape(certificate.issuedAt.slice(0, 10))} · ${escape(certificate.id)}</text></g></svg>`;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'course-certificate.svg'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setResult('Certificate generated.');
      } else setResult(response.message || 'Access updated.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be completed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><button type="button" className="cw-text-link" disabled={!props.editing} onClick={() => { setConfig(structuredClone(props.config)); setExperience(structuredClone(props.experience)); setError(''); setResult(''); setOpen(true); }}>{translateText(section === 'access' ? 'Manage access' : 'Advanced settings')}</button>
    {open && <Dialog title={translateText(`${section[0].toUpperCase() + section.slice(1)} options`)} onClose={() => { if (!lock.current) setOpen(false); }}><form onSubmit={event => {
      event.preventDefault(); if (lock.current) return;
      for (const value of [experience.checkout.termsUrl, experience.checkout.privacyUrl, config.communityUrl]) if (value && !/^https?:\/\/[^\s]+$/i.test(value)) { setError('Enter valid HTTP or HTTPS URLs.'); return; }
      if (section === 'checkout') { props.customize({ checkout: experience.checkout }); props.configure({ customCheckoutFields: config.customCheckoutFields, checkoutFields: config.checkoutFields, thankYouTemplate: config.thankYouTemplate, thankYouUrl: config.thankYouUrl, thankYouVideoUrl: config.thankYouVideoUrl, communityUrl: config.communityUrl }); }
      if (section === 'settings') props.configure({ communityUrl: config.communityUrl, certificateEnabled: config.certificateEnabled, certificateIssuer: config.certificateIssuer, bufferBefore: config.bufferBefore, bufferAfter: config.bufferAfter, cancellationHours: config.cancellationHours, cancellationPolicy: config.cancellationPolicy });
      if (section === 'automation') props.configure({ automations: config.automations });
      if (section === 'access') props.configure({ downloadExpiryHours: config.downloadExpiryHours });
      if (section === 'booking') props.configure({ calendarId: config.calendarId, bookingUrl: config.bookingUrl, bookingSlots: config.bookingSlots });
      setOpen(false);
    }}><fieldset disabled={busy} style={{ display: 'contents' }}>
      {section === 'checkout' && <><CustomFieldsEditor config={config} configure={patch}/><PageSelector product={props.product} config={{...config,experience}} configure={patch} editing kind="thankYou"/><Toggle label="Require terms agreement" checked={!!experience.checkout.requireTerms} onChange={requireTerms => checkout({ requireTerms })}/><PolicyControls checkout={experience.checkout} onChange={checkout}/><p className="cw-help">{translateText("An order bump is an optional add-on checkbox displayed on the checkout form before payment. Its price is added to the order total when selected.")}</p><Toggle label="Enable order bump" checked={!!experience.checkout.bumpEnabled} onChange={bumpEnabled => checkout({ bumpEnabled })}/><Field label="Order bump product"><CommerceSelect label="Order bump product" value={experience.checkout.bumpProductId || ''} options={[{ value: '', label: 'No product selected' }, ...props.products.filter(product => product.id !== props.product.id && product.status === 'Active').map(product => ({ value: product.id, label: product.name + ' · ' + product.price, disabled: product.config?.currency !== config.currency || product.config?.billing !== 'One-time' }))]} onChange={bumpProductId => checkout({ bumpProductId })}/></Field><p className="cw-help">{translateText("Order bumps use one-time products in the checkout currency.")}</p></>}
      {section === 'settings' && kind === 'course' && <><Field label="Community discussion URL"><input type="url" value={config.communityUrl} onChange={event => patch({ communityUrl: event.target.value })}/></Field><Toggle label="Enable completion certificates" checked={!!config.certificateEnabled} onChange={certificateEnabled => patch({ certificateEnabled })}/><Field label="Certificate issuer"><input value={config.certificateIssuer || ''} onChange={event => patch({ certificateIssuer: event.target.value })}/></Field></>}
      {section === 'settings' && kind === 'service' && <><Field label="Buffer before (minutes)"><input type="number" min="0" value={config.bufferBefore ?? 0} onChange={event => patch({ bufferBefore: Number(event.target.value) })}/></Field><Field label="Buffer after (minutes)"><input type="number" min="0" value={config.bufferAfter ?? 0} onChange={event => patch({ bufferAfter: Number(event.target.value) })}/></Field><Field label="Cancellation notice (hours)"><input type="number" min="0" value={config.cancellationHours ?? 0} onChange={event => patch({ cancellationHours: Number(event.target.value) })}/></Field><Field label="Cancellation policy"><textarea value={config.cancellationPolicy || ''} onChange={event => patch({ cancellationPolicy: event.target.value })}/></Field></>}
      {section === 'automation' && <><Toggle label="Send file delivery notification" checked={!!config.automations.fileDelivery} onChange={fileDelivery => patch({ automations: { ...config.automations, fileDelivery } })}/><Toggle label="Include calendar invitation" checked={!!config.automations.calendarInvite} onChange={calendarInvite => patch({ automations: { ...config.automations, calendarInvite } })}/></>}
      {section === 'booking' && <><Field label="Workspace calendar"><CommerceSelect label="Workspace calendar" value={config.calendarId || ''} options={[{ value: '', label: 'External calendar URL' }, ...calendars.filter(calendar => !calendar.archived).map(calendar => ({ value: calendar.id, label: calendar.name || calendar.title || calendar.id }))]} onChange={calendarId => { const calendar = calendars.find(row => row.id === calendarId); patch({ calendarId, ...(calendar ? { bookingUrl: `${window.location.origin}/book/${encodeURIComponent(calendar.slug || calendar.id)}`, bookingSlots: [] } : {}) }); }}/></Field><SlotChips disabled={!!config.calendarId} values={config.bookingSlots ?? []} onChange={bookingSlots => patch({ bookingSlots })}/><p className="cw-help">{translateText('Availability and reservations are checked by the connected calendar. Preview slot labels do not reserve appointments.')}</p><button type="button" className="cw-button" disabled={!props.product.id} onClick={() => void access('syncCalendar')}>{translateText('Sync saved calendar settings')}</button></>}
      {section === 'access' && <><Field label="Download expiration (hours)"><input type="number" min="1" max="720" value={config.downloadExpiryHours ?? 24} onChange={event => patch({ downloadExpiryHours: Number(event.target.value) })}/></Field><p className="cw-help">{translateText('Save Changes before generating access links. Access actions use the saved product settings.')}</p><Field label="Customer email"><input type="email" value={email} onChange={event => setEmail(event.target.value)}/></Field><div className="cw-header-actions"><button type="button" className="cw-button" disabled={!props.product.id || !email} onClick={() => void access('grant')}>{translateText('Generate access link')}</button><button type="button" className="cw-button" disabled={!props.product.id || !email} onClick={() => void access('revoke')}>{translateText('Revoke access')}</button>{kind === 'course' && <button type="button" className="cw-button" disabled={!props.product.id || !email} onClick={() => void access('certificate')}>{translateText('Generate certificate')}</button>}</div></>}
      {error && <p className="cw-errors" role="alert">{error}</p>}{result && <p className="cw-help" role="status">{result.startsWith('http') ? <a href={result} target="_blank" rel="noreferrer">{result}</a> : result}</p>}<div className="course-modal-actions"><button type="button" className="cw-button" onClick={() => setOpen(false)}>{translateText('Cancel')}</button><button className="cw-button primary" type="submit">{translateText('Apply to draft')}</button></div>
    </fieldset></form></Dialog>}
  </>;
}
