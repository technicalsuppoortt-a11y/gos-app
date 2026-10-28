# Shared support messaging

The user, admin and super-admin dashboards share `SupportChat`, its media components and the existing `supportChat` Firebase callable. Firestore remains the real-time database and Firebase Storage holds attachments. The existing external GOS API setup and authentication flow are unchanged.

## Navigation and conversations

- Admin support separates **Users** and **Super Admin** into horizontal tabs, with role badges and contact filtering.
- The plus button beside search opens New Chat, including eligible contacts who have never sent a message. Explicit support assignments remain authoritative; unassigned users in an admin's workspace are eligible for a new conversation.
- User support is a regular `/dashboard/support` child route inside the existing user layout and main sidebar. It opens the assigned admin conversation directly when there is one eligible contact.
- The admin floating icon opens a native modal containing the shared chat, with a full-page link. It is hidden on the full support page to avoid duplicating that interface.
- Super admins see eligible admins; users see their eligible admin. No user-to-user or arbitrary cross-workspace contact access is introduced.

## Message actions and persistence

| Feature | Implementation |
| --- | --- |
| Voice | User-initiated MediaRecorder, visible recording timer, stop action and microphone cleanup. Web Audio computes real waveform samples and duration; the player provides play/pause, seeking and elapsed/total time. Audio metadata persists with the attachment. |
| Files | Up to three files, each at most 10 MB. Images have inline and full previews; PDFs have a modal preview; files have download and open actions. |
| Reactions | One reaction per participant; selecting the same emoji removes it. Updates are transactional and real-time. |
| Editing | Inline text editor; only the authenticated author may edit. An edited marker persists. |
| Delete for me | The caller's UID is added to `hiddenFor`. Their clients hide the message; the other participant retains it. |
| Delete for everyone | Author-only tombstone, clearing text, displayed file references, reactions and reply context. Existing downloaded/forwarded copies cannot be remotely erased. |
| Reply | Saved parent ID, author and preview. Loaded parent edits/deletions update the displayed quote; clicking anchors and highlights the parent. Earlier history can be loaded in batches of 100. |
| Forward | Server verifies source and target relationships, creates the target room when needed, and copies attachments to the target room's Storage prefix with new download tokens. Forwarded payloads identify the forwarding author separately from the original author. |
| Copy | Explicit clipboard action with a success notice or visible browser-permission error. |

Send and forward IDs are retained across retries. Account changes clear thread state and stop microphone use; stale request completions do not clear another account's draft. Playback pauses when its media component is removed.

Existing basic send/read/delete calls remain compatible. New message fields are optional, so existing conversations do not require migration.

## Security and deployment

Message mutations remain callable-only. Firestore clients can read only rooms in which they participate and cannot write arbitrary message or participant documents. Storage uploads require active account status, room participation and the caller's author prefix. Forwarding copies files rather than exposing a source room's private paths to a new recipient.

The Storage service agent needs `roles/firebaserules.firestoreServiceAgent` to evaluate the room-membership lookup in Storage rules. Live inspection found that grant missing; `scripts/enable-support-storage-access.mjs` adds the standard role only to this project's Storage service agent, preserving other IAM bindings with an etag. See [Firebase's cross-service Storage rules documentation](https://firebase.google.com/docs/storage/security/rules-conditions#enhance_with_firestore).

Direct browser downloads also require bucket CORS. `scripts/enable-support-download-cors.mjs` appends GET/HEAD download access while preserving existing entries and using the bucket metageneration as a precondition. It does not grant file read/write access or change Firebase authorization rules. This follows [Firebase's browser-download CORS guidance](https://firebase.google.com/docs/storage/web/download-files#cors_configuration).

The support callable is deployed before the frontend so new actions are available when the interface is released. Existing workspace, payment and other API permissions are unchanged.

## Verification

- Unit checks cover all role pairs, new unmessaged workspace contacts, explicit-assignment isolation, retry-safe sends, replies, author-only editing/deletion, reaction toggling, caller-only hiding, attachment validation and forwarding with copied audio metadata.
- Browser checks exercise admin tabs, New Chat, the quick overlay, the user sidebar route, super-admin/user views, edit/react/copy/reply/forward/delete actions, image/PDF previews, image download, synthetic microphone recording, saved waveform/duration, playback, light/dark mode and mobile switching.
- Live disposable-account checks verify Firestore persistence for actions, actual Storage uploads/downloads, server-side file copying, forwarded waveform/duration and denied file reads by an unrelated user. The test removes its accounts, rooms, messages and media files.
- Run `node --test functions/tests/support-rich.test.mjs functions/tests/support-cors.test.mjs functions/tests/admin-updates.test.mjs` for backend checks. The broader regression suite includes the existing admin, impersonation and GOS API tests.
- Run `node tests/admin-updates-browser.test.mjs` with `PLAYWRIGHT_MODULE` set to the available Playwright package. This fixture uses a synthetic microphone and simulated backend responses.
- `node scripts/smoke-support-rich.mjs` uses the signed-in Firebase CLI account and creates disposable live fixtures; it never logs credentials or modifies real conversations.

On 2026-10-28 the TypeScript check, production build, 33 targeted unit/regression checks, browser media/action checks and live rich-message checks passed. The live check also verified download CORS for `http://localhost:5173`. The updated support callable and frontend were deployed to `gos-app-3c7fb`; disposable accounts, threads, messages and media were cleaned up.
