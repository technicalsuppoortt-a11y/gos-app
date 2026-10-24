// Read-only production checks: preflight and rejected requests never provision a domain.
import assert from 'node:assert/strict';

const base = 'https://us-central1-gos-app-3c7fb.cloudfunctions.net';
for (const endpoint of ['verifyDomain', 'hostingDomain']) {
  for (const origin of ['https://gos-app-3c7fb.web.app', 'http://localhost:5173']) {
    const response = await fetch(`${base}/${endpoint}`, {
      method: 'OPTIONS', signal: AbortSignal.timeout(30000),
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
    });
    assert.equal(response.status, 204, `${endpoint}: preflight status`);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.match(response.headers.get('access-control-allow-headers'), /authorization/i);
    console.log(`${endpoint}: ${origin} preflight OK`);
  }
  for (const token of ['', 'invalid-token']) {
    const origin = 'https://gos-app-3c7fb.web.app';
    const response = await fetch(`${base}/${endpoint}`, {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ data: {} }),
    });
    assert.equal(response.status, 401, `${endpoint}: authentication status`);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal((await response.json()).error.status, 'UNAUTHENTICATED');
    console.log(`${endpoint}: ${token ? 'invalid' : 'missing'} token rejected with callable JSON and CORS OK`);
  }
}
