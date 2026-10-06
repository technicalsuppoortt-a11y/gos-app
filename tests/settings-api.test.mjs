import { createServer } from 'vite';
import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
globalThis.window = { addEventListener() {} };
const server = await createServer({ appType:'custom',server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},define:{'import.meta.env.VITE_SETTINGS_API_URL':JSON.stringify('https://api.example.test')} });
const originalFetch = globalThis.fetch;
try {
  const { store } = await server.ssrLoadModule('/src/store/index.ts');
  const { loginSuccess } = await server.ssrLoadModule('/src/store/slices/authSlice.ts');
  const { settingsRequest, settingsApiEnabled, friendlyError } = await server.ssrLoadModule('/src/pages/settings/data.ts');
  assert.equal(settingsApiEnabled,true);
  store.dispatch(loginSuccess({user:{id:'api-user',name:'API User',email:'api@example.com'},role:'ADMIN',tenant:{id:'tenant-api',name:'API'},token:'test-session-token'}));
  let captured;
  globalThis.fetch = async (url, options) => {captured={url,options};return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}});};
  assert.deepEqual(await settingsRequest('/integrations/stripe/test',{}),{ok:true});
  assert.equal(captured.url,'https://api.example.test/integrations/stripe/test');
  assert.equal(captured.options.method,'POST');assert.equal(captured.options.credentials,'include');
  assert.equal(captured.options.headers.Authorization,'Bearer test-session-token');assert.equal(captured.options.headers['X-Tenant-ID'],'tenant-api');assert.equal(captured.options.body,'{}');
  await settingsRequest('/integrations/stripe',undefined,'DELETE');assert.equal(captured.options.method,'DELETE');assert.equal(captured.options.body,undefined);
  await settingsRequest('/billing/recharge',{enabled:true,below:'10',amount:'50',method:'test-method'},'PATCH');assert.equal(captured.options.method,'PATCH');assert.equal(JSON.parse(captured.options.body).method,'test-method');
  for(const [status,expected] of [[401,/session has expired/],[403,/does not have permission/],[409,/changed elsewhere/],[500,/temporarily unavailable/]]){
    globalThis.fetch=async()=>new Response('SECRET_RAW_PROVIDER_STACK_TRACE',{status});
    await assert.rejects(settingsRequest('/settings'),expected);
  }
  globalThis.fetch=async()=>new Response(null,{status:204});assert.equal(await settingsRequest('/account',{confirmation:'DELETE'},'DELETE'),undefined);
  assert.equal(friendlyError(new SyntaxError('SECRET_RAW_RESPONSE')),'We could not reach the service. Check your connection and try again.');
  assert.equal(friendlyError(new TypeError('fetch failed')),'We could not reach the service. Check your connection and try again.');
  console.log('PASS API requests, tenant/session headers, mutations, permission/session/conflict/outage recovery, empty responses, private error suppression');
} finally {globalThis.fetch=originalFetch;await server.close();}
