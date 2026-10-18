Please replace the Cloud Function call for `settingsService` (and any related backend service calls that fail on the free tier) with a direct client-side Firestore implementation:

1. **Bypass Cloud Functions for Settings:**
   - Instead of invoking `https://us-central1-.../settingsService` via Firebase Functions SDK, fetch and update workspace settings, profile data, and configurations directly using Firestore client SDK collections (e.g., `settings` or `workspaces` collection).
2. **Graceful Local Fallback:**
   - If a settings document doesn't exist yet in Firestore, return sensible default settings locally so the settings pages (`/dashboard/settings/profile`, `/dashboard/settings/integrations`, etc.) render smoothly without showing "internal [0]" or crashing.
3. **Clean Error Handling:**
   - Remove any misleading toasts about deploying Firebase Functions on the Blaze plan, and handle loading states cleanly on the client side.