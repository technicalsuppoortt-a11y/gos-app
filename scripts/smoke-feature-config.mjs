import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { projectId, apiKey } = JSON.parse(readFileSync(new URL('../src/backend/gos-public-config.json', import.meta.url)));
for (const name of ['configurePaymentMethods', 'marketingTrackingConfiguration']) {
  const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { operation: 'get' } }) });
  const payload = await response.json();
  assert.equal(response.status, 401); assert.equal(payload.error?.status, 'UNAUTHENTICATED');
  console.log(`${name}: deployed and rejects unauthenticated access`);
}
for (const key of ['paymentMethods', 'marketingTracking']) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/${key}?key=${apiKey}`);
  assert.ok([200, 404].includes(response.status), `${key}: public configuration read rejected (${response.status})`);
  console.log(`${key}: public configuration rules active (${response.status})`);
}
for (const operation of ['getGateway', 'saveGateway']) {
  const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/configurePaymentMethods`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { operation, provider: 'stripe' } }) });
  const payload = await response.json();
  assert.equal(response.status, 401); assert.equal(payload.error?.status, 'UNAUTHENTICATED');
  console.log(`${operation}: rejects unauthenticated credential access`);
}
const privateResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/paymentGatewayConfigurations/stripe?key=${apiKey}`);
assert.equal(privateResponse.status, 403);
console.log('Private gateway documents: public access denied');
