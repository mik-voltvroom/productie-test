# Volt & Vroom Production Deploy Workflow

Status: ACTIVE
Created: 2026-08-21
Release branch: `release/production-2026-08-21`
Frozen baseline: `eeb8e3f56ae8590c89913a5b1ea8d2b74e41fe26`

## Deploy policy

From the start of this workflow, the production release baseline is frozen. No new product features are added to the release branch. Only deploy blockers, security fixes, test fixes, configuration corrections and production-hardening changes may be added until production go-live is completed.

Normal feature work should not be merged into the release branch during this window.

## Workflow

1. Main/release freeze — COMPLETE
   - Freeze current deploy candidate.
   - Create a dedicated production release branch from the known baseline.
   - Only blocker/security/configuration fixes are allowed on the release branch.

2. CI fully green — COMPLETE
   - Repository guard
   - Agent audit
   - Brand audit
   - TypeScript typecheck
   - Unit/integration tests
   - Firestore rules emulator tests
   - Production Next.js build

3. Create separate production Firebase/App Hosting backend — PREPARED
   - Do not point the staging backend at production.
   - Production must have its own environment values and runtime identity.

4. Configure production secrets — BLOCKED BY BILLING/ACCESS
   - Hexon/Mobilox credentials
   - CRON secret
   - Portal token secret
   - Audit hash salt
   - Required Firebase production configuration

5. Deploy Firestore rules and indexes — DEPLOY READY

6. Validate Firebase Storage IAM — COMPLETE
   - Confirm App Hosting runtime can create/read/delete a canary object in the configured bucket.
   - Runtime health check: authenticated `POST /api/admin/storage-health` (owner/admin only).
   - Confirm Mobilox image path `vehicles/{externalId}/mobilox/{fileName}` is covered by Storage rules.
   - Do not grant broad Owner/Editor permissions.

7. Deploy production build to temporary App Hosting URL — NEXT

8. Production smoke test
   - Homepage
   - Mobile navigation
   - Inventory listing
   - Vehicle detail
   - Contact/lead form
   - VVOS login/dashboard

9. Run one real Mobilox end-to-end mutation
   - add/change vehicle
   - exact response `1`
   - integration event written
   - Mobilox image host accepted by the explicit allowlist
   - validated Mobilox image URL written to Firestore
   - vehicle visible in website and VVOS

10. Validate VVOS inventory
    - website and VVOS use the same Firestore `vehicles` source
    - add/change/delete/archive behavior verified

11. SEO production check
    - production index/follow
    - staging noindex/nofollow
    - canonical URLs
    - OpenGraph
    - structured data
    - sitemap/robots

12. Connect `voltvroom.nl` / `www.voltvroom.nl`

13. Validate HTTPS and canonical redirects

14. Monitor first 24 hours
    - App Hosting/build errors
    - Mobilox/Hexon mutations
    - image ingestion
    - leads
    - Firebase runtime errors

## Production go/no-go gates

Production go-live is allowed only when all four are true:

- CI is fully green.
- Production Firebase/App Hosting is isolated from staging.
- Firebase Storage write from the production runtime succeeds.
- A real Mobilox end-to-end mutation succeeds and is visible in both website and VVOS.

## Current step

Step 6 is complete. The deployed App Hosting runtime Storage IAM health check succeeded, confirming create/read/delete access to the configured Firebase Storage bucket. The nested Mobilox vehicle image path is covered by `storage.rules`. The next step is Step 7: deploy the production build to a temporary App Hosting URL. Step 7 remains blocked until the production App Hosting backend can be activated with the required billing/access.
