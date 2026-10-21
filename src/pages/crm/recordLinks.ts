import type { CanonicalLead } from '../../store/slices/crmSlice';
// Never match absent identifiers: two contacts with blank emails are unrelated.
export function linkedToLead(row: Record<string, any>, lead: Pick<CanonicalLead, 'id' | 'email' | 'phone' | 'bookingId' | 'orderId'>, resource?: 'booking' | 'order') {
  if (row.leadId === lead.id || row.lead_id === lead.id || row.contactId === lead.id || row.contact_id === lead.id) return true;
  if (resource === 'booking' && lead.bookingId && row.id === lead.bookingId) return true;
  if (resource === 'order' && lead.orderId && (row.id === lead.orderId || (row.orderId || row.order_id) === lead.orderId)) return true;
  const email = lead.email?.trim().toLowerCase();
  if (email && [row.email, row.customerEmail, row.customer_email, row.customer?.email].some(value => typeof value === 'string' && value.trim().toLowerCase() === email)) return true;
  const phone = lead.phone?.replace(/\D/g, '');
  return Boolean(phone && phone.length >= 7 && [row.phone, row.customerPhone, row.customer_phone, row.customer?.phone].some(value => typeof value === 'string' && value.replace(/\D/g, '') === phone));
}

export function productCheckoutURL(product: { config?: { experience?: { directCheckoutUrl?: string }; salesUrl?: string } }) {
  for (const candidate of [product.config?.experience?.directCheckoutUrl, product.config?.salesUrl]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
    } catch { /* Only share configured, absolute public links. */ }
  }
  return '';
}
