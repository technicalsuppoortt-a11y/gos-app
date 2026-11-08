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
function resolvePaymentScope(requestData, user) {
  const rawScope = requestData?.scope;
  if (rawScope === undefined) {
    return {
      scope: undefined,
      targetId: undefined,
      canManage: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
      refPath: 'settings/paymentMethods',
      mirrorPaths: [],
      gatewayKey: provider => `paymentGatewayConfigurations/${provider}`,
    };
  }
  if (!['super_admin', 'admin', 'user', 'platform'].includes(rawScope)) {
    throw new HttpsError('invalid-argument', 'Invalid payment scope.');
  }
  const scope = rawScope === 'platform' ? 'super_admin' : rawScope;
  if (scope === 'super_admin') {
    return {
      scope: 'super_admin',
      targetId: 'platform',
      canManage: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_FINANCE'].includes(user.role),
      refPath: 'settings/paymentMethods',
      mirrorPaths: ['tenants/platform/paymentMethods/config', 'settings/paymentMethods_super_admin'],
      gatewayKey: provider => `paymentGatewayConfigurations/${provider}`,
    };
  }
  const targetId = String(requestData?.tenantId || requestData?.targetId || user.tenantId || user.uid || '').trim();
  if (!targetId || targetId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Invalid payment scope target.');
  }
  if (scope === 'admin') {
    const canManage = user.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && (targetId === user.tenantId || targetId === user.uid));
    const altId = user.role === 'ADMIN' && user.uid && user.tenantId && user.uid !== user.tenantId ? (targetId === user.uid ? user.tenantId : user.uid) : '';
    const gwOwner = user.role === 'ADMIN' ? (user.uid || targetId) : targetId;
    return {
      scope: 'admin',
      targetId,
      canManage,
      refPath: `tenants/${targetId}/paymentMethods/config`,
      mirrorPaths: [
        ...(altId ? [`tenants/${altId}/paymentMethods/config`, `settings/paymentMethods_admin_${altId}`] : []),
        `settings/paymentMethods_admin_${targetId}`,
      ],
      gatewayKey: provider => `paymentGatewayConfigurations/admin_${gwOwner}_${provider}`,
    };
  }
  const canManage = ['ADMIN', 'SUPER_ADMIN'].includes(user.role) || (user.role === 'USER' && (targetId === user.tenantId || targetId === user.uid));
  const altId = user.role === 'USER' && user.uid && user.tenantId && user.uid !== user.tenantId ? (targetId === user.uid ? user.tenantId : user.uid) : '';
  return {
    scope: 'user',
    targetId,
    canManage,
    refPath: `tenants/${targetId}/paymentMethods/config`,
    mirrorPaths: [
      ...(altId ? [`tenants/${altId}/paymentMethods/config`, `settings/paymentMethods_user_${altId}`] : []),
      `settings/paymentMethods_user_${targetId}`,
    ],
    gatewayKey: provider => `paymentGatewayConfigurations/user_${targetId}_${provider}`,
  };
}

export async function configurePaymentMethodsRequest(request, { actor, db }) {
  const user = await actor(request);
  const operation = request.data?.operation ?? 'save';
  if (!['get', 'save', 'getGateway', 'saveGateway'].includes(operation)) throw new HttpsError('invalid-argument', 'Invalid payment configuration request.');
  const { scope, targetId, canManage, refPath, mirrorPaths, gatewayKey } = resolvePaymentScope(request.data, user);
  if (operation !== 'get' && !canManage) throw new HttpsError('permission-denied', 'You do not have permission to configure these payment methods.');
  const gatewayOperation = operation === 'getGateway' || operation === 'saveGateway';
  const provider = request.data?.provider;
  if (gatewayOperation && !Object.hasOwn(gatewayFields, provider)) throw new HttpsError('invalid-argument', 'Invalid payment gateway.');
  const ref = db.doc(refPath);
  const mirrorRefs = mirrorPaths.map(path => db.doc(path));
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const previous = snapshot.data() ?? {};
    if (operation === 'get') return { methods: previous.methods ?? [], revision: previous.revision ?? 0, canManage, ...(scope ? { scope, tenantId: targetId } : {}) };
    const scopeMeta = scope ? { scope, tenantId: targetId } : {};
    if (gatewayOperation) {
      // Admin SDK only: never put this document, or its secrets, in the public projection.
      const privateRef = db.doc(gatewayKey(provider));
      const privateConfig = (await tx.get(privateRef)).data() ?? {};
      if (operation === 'getGateway') return { ...gatewaySummary(provider, privateConfig.credentials), gatewayRevision: privateConfig.revision ?? 0 };
      if (request.data.expectedGatewayRevision !== undefined && request.data.expectedGatewayRevision !== (privateConfig.revision ?? 0)) throw new HttpsError('aborted', 'Gateway configuration changed in another session. Reopen the configuration and try again.');
      if (request.data.expectedRevision !== undefined && request.data.expectedRevision !== (previous.revision ?? 0)) throw new HttpsError('aborted', 'Payment methods changed in another session. Review the latest configuration and save again.');
      const credentials = validateGatewayConfiguration(provider, request.data.configuration, privateConfig.credentials);
      const method = validatePaymentMethods([{ id: provider, provider, type: 'gateway', name: ({ paddle: 'Paddle', paymob: 'Paymob', stripe: 'Stripe', paypal: 'PayPal', paytabs: 'PayTabs', fawry: 'Fawry', kashier: 'Kashier' })[provider], account: request.data.label, instructions: '', enabled: request.data.enabled }])[0];
      const methods = [...(previous.methods ?? []).filter(m => m.provider !== provider), method];
      const revision = (previous.revision ?? 0) + 1;
      const audit = { updatedBy: user.uid, updatedAt: new Date().toISOString() };
      tx.set(privateRef, { provider, credentials, revision: (privateConfig.revision ?? 0) + 1, ...scopeMeta, ...audit });
      // Credentials being present does not prove that a provider connection is verified.
      const payload = { methods, revision, ...scopeMeta, ...audit };
      tx.set(ref, payload);
      for (const mirror of mirrorRefs) tx.set(mirror, payload);
      return { methods, revision, canManage, ...scopeMeta };
    }
    if (request.data.expectedRevision !== undefined && request.data.expectedRevision !== (previous.revision ?? 0)) throw new HttpsError('aborted', 'Payment methods changed in another session. Review the latest configuration and save again.');
    const methods = validatePaymentMethods(request.data?.methods, snapshot.data()?.methods ?? []);
    const revision = (previous.revision ?? 0) + 1;
    const payload = { methods, revision, ...scopeMeta, updatedBy: user.uid, updatedAt: new Date().toISOString() };
    tx.set(ref, payload);
    for (const mirror of mirrorRefs) tx.set(mirror, payload);
    return { methods, revision, canManage, ...scopeMeta };
  });
}
