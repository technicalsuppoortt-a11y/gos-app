# GOS REST integration

The API defaults to `https://gos-api.vercel.app`. Override it with
`VITE_GOS_API_BASE_URL` in your Vite environment, then restart Vite.
Firebase remains responsible for sign-in. Each authenticated request obtains
the current Firebase ID token through `getIdToken()`. A 401 forces one token
refresh. Tokens are never stored by the REST client. The server derives the
tenant; the frontend sends neither `tenant_id` nor `X-Tenant-ID`.

`src/backend/gosApi.ts` covers health/auth, Firestore status, CRM pipelines,
presets, leads, stage moves, notes, bulk operations, import/export, AI sources,
assistant settings, playground tests/grades, and inbox ingestion/conversations.

AI Follow-Up → Knowledge accepts text, instructions, and multipart files
(`.txt`, `.md`, `.csv`, `.pdf`). It verifies `/auth/me` before loading data,
shows initial skeletons, reports upload/validation errors, and polls the source
list while indexing is queued or processing. Polling stops after roughly five
minutes with a refresh action. Sources are never marked ready by the client.
URL crawling and Word uploads are not specified by this collection.

Assistant live/channel controls use the singleton assistant endpoint. Existing
profile labels, workflows, and other workspace features retain their Firebase
implementation. Playground answers, outcomes, citation counts, history, and
grades use the REST API. CRM core writes wait for API success and use server IDs;
workspace-only metadata continues to use the existing workspace storage.

Inbox reads and refreshes API conversations and their messages. Explicit
`VITE_LOCAL_DEMO=true` keeps the isolated demo. `POST /inbox/messages` is an
**inbound customer event**, not staff delivery. The client exposes
`gosApi.receiveMessage()` with the documented external thread/message IDs.
Reuse the same external message ID when retrying an event. The collection has
no staff reply, note, assignment, tag, or takeover endpoint; those operations
display an availability notice in REST Inbox instead of pretending to save.

## Verification

- `npm run test:gos-api`: isolated transport and concrete upload-flow checks.
- `npm run build`: TypeScript and production bundle.
- `npm run smoke:gos-api`: authenticated live text/file upload and indexing.

For the live smoke test, set `FIREBASE_ID_TOKEN` in the process environment to
a fresh token for a user provisioned in the GOS API. Do not put a real token in
source control or the Postman collection. The script verifies health, current
user and token; uploads the fixture as text and a real TXT multipart file;
checks both are listed and ready with indexed chunks; then checks the grounded
playground response, grading, history, assistant, and inbox reads. It does not
enable live replies or alter messaging channels. Use `-- --cleanup` to remove
only the two sources created by that run. `GOS_SMOKE_TIMEOUT_MS` adjusts the
default three-minute indexing deadline; `GOS_API_BASE_URL` overrides the host.
Add `-- --inbox` to create one clearly named customer test conversation, check
its actual answered/paused/handoff outcome, and verify duplicate-event handling.

The source fixture is `tests/fixtures/gos-coaching-notes.txt`. Its concrete
facts include twelve-week online coaching, Cairo sessions, and support hours.
If indexing stays queued, the API deployment needs a working queue processor
and its embedding-provider configuration. The frontend cannot start that worker.

Live public health returned HTTP 200 with `status: ok` during implementation.
Authenticated live indexing requires a real provisioned Firebase session;
passing isolated tests does not establish live token mapping or queue health.
