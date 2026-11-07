// Credentials live in Secret Manager, never in readable integration documents.
// Provider that carries each outbound channel (used for communication-credit charging).
export const DELIVERY_PROVIDERS = Object.freeze({ email: 'resend', whatsapp: 'meta' });
// Channels whose provider reports sent/delivered/failed via webhooks; others are confirmed on acknowledgement.
export const STATUS_WEBHOOK_CHANNELS = Object.freeze(['whatsapp']);
export const deliveryProvider = channel => DELIVERY_PROVIDERS[channel] ?? null;

export class DeliveryError extends Error {
  constructor(message, definitive = true) {
    super(message);
    this.definitive = definitive;
  }
}

export function emailCreditAction(attachments = []) {
  if (!Array.isArray(attachments)) return 'email_send_single';
  const large = attachments.some(item => item?.path) || attachments.reduce((total, item) => total + (
    typeof item?.content === 'string' ? Buffer.byteLength(item.content, 'base64') : item?.content?.length ?? 0
  ), 0) >= 1024 * 1024;
  return large ? 'email_send_attachment' : 'email_send_single';
}

export async function deliverMessage(message, lead, config, credentials, fetcher = fetch) {
  let url, body, headers = { 'Content-Type': 'application/json' };
  if (message.channel === 'email') {
    if (!credentials.resendApiKey || !config?.from || !lead.email) throw new DeliveryError('Email delivery requires a Resend secret, verified sender and contact email.');
    url = 'https://api.resend.com/emails';
    headers.Authorization = `Bearer ${credentials.resendApiKey}`;
    headers['Idempotency-Key'] = message.deliveryId;
    body = { from: config.from, to: [lead.email], subject: message.subject || 'Following up', text: message.text };
    if (message.attachments?.length) body.attachments = message.attachments;
  } else if (message.channel === 'whatsapp') {
    if (!credentials.whatsappAccessToken || !/^\d+$/.test(config.phoneNumberId) || !/^v\d+\.\d+$/.test(config.apiVersion || '') || !(lead.whatsapp || lead.phone)) throw new Error('WhatsApp delivery requires Meta credentials, API version, phone number ID and recipient.');
    url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    headers.Authorization = `Bearer ${credentials.whatsappAccessToken}`;
    body = { messaging_product: 'whatsapp', to: lead.whatsapp || lead.phone, type: 'text', text: { body: message.text } };
  } else throw new Error('This channel has no configured delivery adapter.');
  const response = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  // A timeout or ambiguous provider response must be reviewed before retrying.
  if (!response.ok) throw new DeliveryError(`Provider rejected delivery (HTTP ${response.status}).`, response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status));
  const result = await response.json();
  const id = result.id || result.messages?.[0]?.id;
  if (!id) throw new Error('Provider acknowledgement did not include a message ID.');
  return id;
}
