# Launch Brand UI updates — 18 November 2026

Implemented locally:
- Restored the four-stage top bar throughout wizard mode.
- Restored the Website page's original full-page preview without device framing.
- Set the Launch Brand page scale to 65%, with viewport compensation. Browser zoom should be 100%.
- Centered the sidebar's navigation group between branding and account controls; consistent 12–20px gaps, 50px expanded rows, smaller mobile/collapsed spacing.

Validation actually completed:
- Launch Brand TypeScript: passed.
- Main application TypeScript (`tsc -b`): passed.
- Main application Vite build: passed.
- Launch Brand build after full-page restoration and 65% scale: passed.
- Launch Brand Vite build after final sidebar change: passed (21.53s).
- Combined selected route/brand tests: 7 passed; 3 failed during Vite SSR module loading with 60-second transport timeouts. Sequential retry reproduced the loading timeout and was stopped.
- New stage-bar browser regression test was added. The sandboxed Edge process closed before testing. The external retry did not complete and was stopped. No browser pass or visual verification is claimed.

Nothing was deployed. Existing unrelated changes to BrandingStudio.tsx, directAI.js, generation tests and Firebase cache were preserved.
