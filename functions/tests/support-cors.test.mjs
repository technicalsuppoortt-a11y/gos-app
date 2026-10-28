import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { HttpsError } from 'firebase-functions/v2/https';
import { createSupportCallable } from '../support.js';
const express = createRequire(new URL('../package.json', import.meta.url))('express');

test('support callable answers browser preflight before authentication and preserves CORS on auth errors', async () => {
  let actorCalls = 0;
  const handler = createSupportCallable({ actor: async () => { actorCalls++; throw new HttpsError('unauthenticated', 'Sign in to continue.'); }, db: {} });
  const app = express();
  app.use(express.json());
  app.use(handler);
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
    assert.equal(actorCalls, 0);
    const denied = await fetch(endpoint, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { operation: 'contacts' } }) });
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal((await denied.json()).error.status, 'UNAUTHENTICATED');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
