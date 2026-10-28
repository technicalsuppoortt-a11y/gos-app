import { HttpsError } from 'firebase-functions/v2/https';
import { gatewayFields, gatewaySummary } from './payment-gateway-model.js';
import { validateGatewayConfiguration } from './payment-gateway-validation.js';
const providers = new Map([['vodafone','manual'],['instapay','manual'],['etisalat','manual'],['orange','manual'],['bank','manual'],['stc','manual'],['paddle','gateway'],['paymob','gateway'],['stripe','gateway'],['paypal','gateway'],['paytabs','gateway'],['fawry','gateway'],['kashier','gateway']]);
export function validatePaymentMethods(methods, previous = []) {
  if (!Array.isArray(methods) || methods.length > providers.size) throw new HttpsError('invalid-argument', 'Invalid payment methods.');
  const seen = new Set();
  return methods.map(m => {
    if (!m || !providers.has(m.provider) || seen.has(m.provider) || m.id !== m.provider || m.type !== providers.get(m.provider) || typeof m.enabled !== 'boolean') throw new HttpsError('invalid-argument', 'Invalid payment provider.');
    seen.add(m.provider);
    const text = (key, max) => { if (typeof m[key] !== 'string' || m[key].length > max) throw new HttpsError('invalid-argument', `Invalid ${key}.`); return m[key].trim(); };
    const account = text('account', 150); if (!account) throw new HttpsError('invalid-argument', 'Enter an account reference.');
    const verified = previous.find(p => p.provider === m.provider && p.account === account && p.status === 'Connected');
    return { id: m.provider, provider: m.provider, name: text('name', 60), type: providers.get(m.provider), account, instructions: text('instructions', 1000), enabled: m.enabled, status: m.type === 'gateway' && verified ? 'Connected' : 'Configured' };
  });
}
export async function configurePaymentMethodsRequest(request, { actor, db }) {
  const user = await actor(request);
  const canManage = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const operation = request.data?.operation ?? 'save';
  if (!['get', 'save', 'getGateway', 'saveGateway'].includes(operation)) throw new HttpsError('invalid-argument', 'Invalid payment configuration request.');
  if (operation !== 'get' && !canManage) throw new HttpsError('permission-denied', 'Only administrators can configure payment methods.');
  const gatewayOperation = operation === 'getGateway' || operation === 'saveGateway';
  const provider = request.data?.provider;
  if (gatewayOperation && !Object.hasOwn(gatewayFields, provider)) throw new HttpsError('invalid-argument', 'Invalid payment gateway.');
  const ref = db.doc('settings/paymentMethods');
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const previous = snapshot.data() ?? {};
    if (operation === 'get') return { methods: previous.methods ?? [], revision: previous.revision ?? 0, canManage };
    if (gatewayOperation) {
      // Admin SDK only: never put this document, or its secrets, in the public projection.
      const privateRef = db.doc(`paymentGatewayConfigurations/${provider}`);
      const privateConfig = (await tx.get(privateRef)).data() ?? {};
      if (operation === 'getGateway') return { ...gatewaySummary(provider, privateConfig.credentials), gatewayRevision: privateConfig.revision ?? 0 };
      if (request.data.expectedGatewayRevision !== (privateConfig.revision ?? 0)) throw new HttpsError('aborted', 'Gateway configuration changed in another session. Reopen the configuration and try again.');
      if (request.data.expectedRevision !== (previous.revision ?? 0)) throw new HttpsError('aborted', 'Payment methods changed in another session. Review the latest configuration and save again.');
      const credentials = validateGatewayConfiguration(provider, request.data.configuration, privateConfig.credentials);
      const method = validatePaymentMethods([{ id: provider, provider, type: 'gateway', name: ({ paddle: 'Paddle', paymob: 'Paymob', stripe: 'Stripe', paypal: 'PayPal', paytabs: 'PayTabs', fawry: 'Fawry', kashier: 'Kashier' })[provider], account: request.data.label, instructions: '', enabled: request.data.enabled }])[0];
      const methods = [...(previous.methods ?? []).filter(m => m.provider !== provider), method];
      const revision = (previous.revision ?? 0) + 1;
      const audit = { updatedBy: user.uid, updatedAt: new Date().toISOString() };
      tx.set(privateRef, { provider, credentials, revision: (privateConfig.revision ?? 0) + 1, ...audit });
      // Credentials being present does not prove that a provider connection is verified.
      tx.set(ref, { methods, revision, ...audit });
      return { methods, revision, canManage };
    }
    if (request.data.expectedRevision !== undefined && request.data.expectedRevision !== (previous.revision ?? 0)) throw new HttpsError('aborted', 'Payment methods changed in another session. Review the latest configuration and save again.');
    const methods = validatePaymentMethods(request.data?.methods, snapshot.data()?.methods ?? []);
    const revision = (previous.revision ?? 0) + 1;
    tx.set(ref, { methods, revision, updatedBy: user.uid, updatedAt: new Date().toISOString() });
    return { methods, revision, canManage };
  });
}
