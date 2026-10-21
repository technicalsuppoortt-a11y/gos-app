// Credentials live in Secret Manager, never in readable integration documents.
export async function deliverMessage(message, lead, config, credentials, fetcher = fetch) {
  let url, body, headers = { 'Content-Type': 'application/json' };
  if (message.channel === 'email') {
    if (!credentials.resendApiKey || !config.from || !lead.email) throw new Error('Email delivery requires a Resend secret, verified sender and contact email.');
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
  if (!response.ok) throw new Error(`Provider rejected delivery (HTTP ${response.status}).`);
  const result = await response.json();
  const id = result.id || result.messages?.[0]?.id;
  if (!id) throw new Error('Provider acknowledgement did not include a message ID.');
  return id;
}
