# Training Cycle integration verification

Test date: November 3, 2026. Target: `https://gos-api.vercel.app/api/v1`.

The production five-step workflow now sends file multipart uploads, text JSON uploads, URL JSON uploads, overall training reads, individual source reads, contextual playground questions and session continuations, channel reads and updates, assistant live settings, and customer inbox messages through the shared Firebase-authenticated transport. The transport attaches a current Firebase ID token, refreshes it once on HTTP 401, preserves multipart boundaries, and surfaces validation, timeout, and network errors.

Production-only layout rules expand the active Knowledge view through its dashboard wrapper. Existing orb, progress, network, and channel styling is retained. `KnowledgeCycleDemo.tsx`, `KnowledgeDemoScenes.tsx`, and `knowledge-demo.css` have no changes.

## Live HTTP results

No Firebase test token was available. Per the user's direction, live testing continued without authentication. Every request returned HTTP 401 with `Authentication token is missing.` These results confirm an HTTP response from the target, but do **not** confirm endpoint routing, authenticated operation, indexing, crawling, model answers, channel connectivity, or inbox delivery.

| Operation | Method and path | HTTP status |
| --- | --- | --- |
| File upload | `POST /ai/sources` (multipart: name, type=file, file) | 401 |
| Text upload | `POST /ai/sources` (name, type=text, content) | 401 |
| Website crawl | `POST /ai/sources` (name, type=url, url) | 401 |
| Overall progress | `GET /ai/training` | 401 |
| Individual progress | `GET /ai/sources/{sourceId}` | 401 |
| Initial playground question | `POST /ai/playground` (question, channel, city) | 401 |
| Session continuation | `POST /ai/playground` (session_id, source_id, question) | 401 |
| Connected channels | `GET /ai/channels` | 401 |
| Enable channel | `PUT /ai/channels/webchat` (enabled=true) | 401 |
| Enable live replies | `PUT /ai/assistant` (live_enabled=true, channels) | 401 |
| Customer inbox ingestion | `POST /inbox/messages` | 401 |

Because source/session creation was rejected, dependent requests used clearly recorded placeholder UUIDs. No successful writes were observed. Raw statuses, timestamps, and durations are in `reports/training-cycle-live.json`.

## Local verification

- TypeScript project check: passed (`node node_modules/typescript/bin/tsc -b`).
- Production Vite bundle: passed (`node --max-old-space-size=4096 node_modules/vite/bin/vite.js build`). The build reports bundle-size and mixed static/dynamic import warnings.
- Existing transport and CRM regression tests: 16 passed. Includes bearer auth, Firebase refresh after 401, multipart boundary handling, error responses, cancellation, and CRM safety.
- Training Cycle API contract test: passed for all 11 operations with mocked responses; checks exact URL, method, URL body, session context, bearer header, multipart body, channel settings, and live settings.
- Browser workflow test: passed. Covers failed-upload retry without duplication, additive categories, training progress, playground session continuation, channel endpoint use, live customer submission, category persistence, source deletion, light/dark styles, mobile/RTL overflow, modal Escape, surrounding dashboard tabs, and retained drafts.
- Browser evidence: `artifacts/knowledge-workflow/` (includes production upload, training, test, connection, live, and integrated dashboard screenshots).

The supplied Postman Training Cycle requests do not include successful response examples. Successful response compatibility and real indexing/channel behavior remain unverified until an authenticated run is available. The training view displays reported `embedding_percentage`/`progress` when present and otherwise labels its completed-source count fallback.

## Authenticated rerun

Make a current tenant-authorized Firebase ID token available as `FIREBASE_ID_TOKEN` in the process environment, then run:

```powershell
node scripts/test-training-cycle-live.mjs
```

The runner never prints or saves the token. An authenticated run creates QA sources and a customer inbox conversation, temporarily enables webchat/live replies, and attempts to restore the previous assistant/channel settings. It leaves QA sources and the conversation available for inspection. The generated JSON report replaces the prior results. A successful upload alone does not prove asynchronous indexing completion; check source status until ready before assessing grounded answers.
